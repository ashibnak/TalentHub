/**
 * GitHub repo reader — the evidence source for AI skill verification
 * (PROJECT_PLAN §3, step 1).
 *
 * Public repos only. Anything the token can't see anonymously (private, moved,
 * deleted, or a typo'd URL) comes back as a typed `private_or_missing` result
 * rather than an exception, because the caller is a fire-and-forget background
 * task that must record a clean failure instead of crashing.
 *
 * GITHUB_TOKEN is optional: without it the anonymous rate limit is 60 req/h and
 * one verification costs ~5 requests, so set it before more than a handful of
 * projects get published on the same hour.
 */

const API = 'https://api.github.com';
const README_MAX_CHARS = 3000;
const MAX_FILES = 20;
const MAX_COMMITS = 10;
const MAX_LANGUAGES = 5;
const TIMEOUT_MS = 15_000;

export type RepoRef = { owner: string; repo: string };

export type RepoSnapshot = {
  ref: RepoRef;
  name: string;
  description: string | null;
  /** Top 5 languages by bytes, most-used first. */
  languages: string[];
  stars: number;
  lastCommitDate: string | null;
  /** The cache key half that decides whether a re-run may be skipped. */
  lastCommitSha: string | null;
  /** First 3000 chars, or null when the repo has no README. */
  readme: string | null;
  /** Up to 20 top-level entries; directories carry a trailing slash. */
  files: string[];
  /** Up to 10 most recent commit subjects (first line only). */
  commitMessages: string[];
};

export type GithubFailureCode = 'invalid_url' | 'private_or_missing' | 'rate_limited' | 'network' | 'http_error';

export type GithubResult =
  | { ok: true; repo: RepoSnapshot }
  | { ok: false; code: GithubFailureCode; message: string };

/**
 * Pull `{ owner, repo }` out of any github.com URL shape users actually paste
 * (with/without .git, trailing slash, deep link to a subpath). Returns null for
 * anything that isn't a github.com repo URL.
 */
export function parseRepoUrl(url: string): RepoRef | null {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
  if (parsed.hostname !== 'github.com' && parsed.hostname !== 'www.github.com') return null;

  const [owner, repoRaw] = parsed.pathname.split('/').filter(Boolean);
  if (!owner || !repoRaw) return null;

  const repo = repoRaw.replace(/\.git$/i, '');
  if (!/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(repo)) return null;
  return { owner, repo };
}

/** `https://github.com/vercel/swr` → `vercel/swr`; falls back to the raw URL. */
export function repoLabel(url: string): string {
  const ref = parseRepoUrl(url);
  return ref ? `${ref.owner}/${ref.repo}` : url;
}

function headers(accept: string): HeadersInit {
  const h: Record<string, string> = {
    accept,
    'user-agent': 'aigraph-skill-verification',
    'x-github-api-version': '2022-11-28',
  };
  const token = process.env.GITHUB_TOKEN?.trim();
  if (token) h.authorization = `Bearer ${token}`;
  return h;
}

type Fetched = { status: number; text: string };

async function get(path: string, accept = 'application/vnd.github+json'): Promise<Fetched> {
  const res = await fetch(`${API}${path}`, {
    headers: headers(accept),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: 'no-store',
  });
  return { status: res.status, text: await res.text() };
}

function classify(status: number, body: string): GithubFailureCode {
  if (status === 404) return 'private_or_missing';
  // 403/401 on a public read is almost always rate limiting or a bad token;
  // GitHub says which in the body.
  if (status === 403 || status === 429) return /rate limit/i.test(body) ? 'rate_limited' : 'private_or_missing';
  if (status === 401) return 'private_or_missing';
  return 'http_error';
}

function parseJson<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/**
 * Fetch everything the verification prompt needs, in one call.
 *
 * The repo metadata request runs first because it decides existence/visibility;
 * the four evidence requests then run in parallel and each degrades to an empty
 * value on its own failure (a repo with no README still deserves a verdict).
 */
export async function fetchRepoSnapshot(url: string): Promise<GithubResult> {
  const ref = parseRepoUrl(url);
  if (!ref) return { ok: false, code: 'invalid_url', message: `not a github.com repository URL: ${url}` };

  const base = `/repos/${ref.owner}/${ref.repo}`;

  let meta: Fetched;
  try {
    meta = await get(base);
  } catch (err) {
    const name = err instanceof Error ? err.name : '';
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, code: 'network', message: name === 'TimeoutError' ? 'github request timed out' : message };
  }

  if (meta.status !== 200) {
    const code = classify(meta.status, meta.text);
    return {
      ok: false,
      code,
      message:
        code === 'private_or_missing'
          ? `repository is private, missing, or renamed (HTTP ${meta.status})`
          : `github returned HTTP ${meta.status}`,
    };
  }

  const repoJson = parseJson<{ name?: string; description?: string | null; stargazers_count?: number }>(meta.text);
  if (!repoJson?.name) return { ok: false, code: 'http_error', message: 'github returned an unreadable repo payload' };

  const settled = await Promise.allSettled([
    get(`${base}/languages`),
    get(`${base}/commits?per_page=${MAX_COMMITS}`),
    get(`${base}/readme`, 'application/vnd.github.raw'),
    get(`${base}/contents/`),
  ]);

  const ok = (i: number): Fetched | null => {
    const r = settled[i];
    return r.status === 'fulfilled' && r.value.status === 200 ? r.value : null;
  };

  /* languages: { TypeScript: 91234, CSS: 120 } → top 5 by bytes */
  const languages = (() => {
    const raw = ok(0);
    const parsedLangs = raw ? parseJson<Record<string, number>>(raw.text) : null;
    if (!parsedLangs) return [];
    return Object.entries(parsedLangs)
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_LANGUAGES)
      .map(([lang]) => lang);
  })();

  const commits = (() => {
    const raw = ok(1);
    const parsedCommits = raw
      ? parseJson<{ sha?: string; commit?: { message?: string; committer?: { date?: string } } }[]>(raw.text)
      : null;
    if (!Array.isArray(parsedCommits) || parsedCommits.length === 0)
      return { messages: [] as string[], sha: null as string | null, date: null as string | null };
    return {
      // Subject line only — bodies are long and add no verification signal.
      messages: parsedCommits.slice(0, MAX_COMMITS).map((c) => (c.commit?.message ?? '').split('\n')[0].trim()).filter(Boolean),
      sha: parsedCommits[0]?.sha ?? null,
      date: parsedCommits[0]?.commit?.committer?.date ?? null,
    };
  })();

  const readme = (() => {
    const raw = ok(2);
    if (!raw || !raw.text.trim()) return null;
    return raw.text.slice(0, README_MAX_CHARS);
  })();

  const files = (() => {
    const raw = ok(3);
    const entries = raw ? parseJson<{ name?: string; type?: string }[]>(raw.text) : null;
    if (!Array.isArray(entries)) return [];
    return entries
      .slice(0, MAX_FILES)
      .map((e) => (e.type === 'dir' ? `${e.name}/` : e.name))
      .filter((n): n is string => !!n);
  })();

  return {
    ok: true,
    repo: {
      ref,
      name: `${ref.owner}/${repoJson.name}`,
      description: repoJson.description ?? null,
      languages,
      stars: repoJson.stargazers_count ?? 0,
      lastCommitDate: commits.date,
      lastCommitSha: commits.sha,
      readme,
      files,
      commitMessages: commits.messages,
    },
  };
}
