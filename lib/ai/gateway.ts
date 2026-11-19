/**
 * AI gateway — the single place the app talks to an LLM.
 *
 * Deliberately provider-agnostic: an OpenAI-compatible `/chat/completions`
 * endpoint described entirely by AI_BASE_URL / AI_API_KEY / AI_MODEL, which is
 * the dialect the Iranian proxies speak. PROJECT_PLAN §3.0 selects AvalAI +
 * gpt-4o, but that choice lives in env — no provider name appears in this file,
 * so switching is a config change and never a code change. (The earlier AI_HA_*
 * names and the api.ai-ha.ir default were trial leftovers and are gone.)
 *
 * Contract for callers: `complete()` NEVER throws. Every failure — missing
 * config included — comes back as a typed `{ ok: false, code }` result, so a
 * page render or a server action can degrade instead of crashing. The loud part
 * of "fail loudly" is the console.error, not an exception.
 */
import type { ZodType } from 'zod';

/* ─────────────────────────────── Config ──────────────────────────── */

export type AiConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
  /** Hostname of the base URL — stored on verification_runs.llm_provider. */
  provider: string;
};

/** The only names the gateway reads. No provider is named anywhere in code. */
const ENV_NAMES = {
  baseUrl: ['AI_BASE_URL'],
  apiKey: ['AI_API_KEY'],
  model: ['AI_MODEL'],
} as const;

/** Thrown by `getAiConfig()` when the gateway is not configured. */
export class AiConfigError extends Error {
  readonly code = 'ai_config_missing' as const;
  readonly missing: readonly string[];

  constructor(missing: readonly string[]) {
    super(`AI gateway is not configured — set ${missing.join(', ')}`);
    this.name = 'AiConfigError';
    this.missing = missing;
  }
}

function readEnv(names: readonly string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

/**
 * Resolve the gateway config from env, or throw `AiConfigError` naming exactly
 * what is missing. Never returns a half-configured client and never no-ops.
 */
export function getAiConfig(): AiConfig {
  const baseUrl = readEnv(ENV_NAMES.baseUrl);
  const apiKey = readEnv(ENV_NAMES.apiKey);
  const model = readEnv(ENV_NAMES.model);

  const missing: string[] = [];
  if (!baseUrl) missing.push(ENV_NAMES.baseUrl[0]);
  if (!apiKey) missing.push(ENV_NAMES.apiKey[0]);
  if (!model) missing.push(ENV_NAMES.model[0]);
  if (missing.length) throw new AiConfigError(missing);

  let provider = baseUrl!;
  try {
    provider = new URL(baseUrl!).hostname;
  } catch {
    // Malformed URL is caught for real by fetch below; keep the raw string here.
  }
  return { baseUrl: baseUrl!.replace(/\/+$/, ''), apiKey: apiKey!, model: model!, provider };
}

/** True when the gateway has enough env to be called at all. */
export function isAiConfigured(): boolean {
  try {
    getAiConfig();
    return true;
  } catch {
    return false;
  }
}

/* ─────────────────────────────── Results ─────────────────────────── */

export type AiFailureCode =
  | 'config_missing'
  | 'timeout'
  | 'network'
  | 'http_error'
  | 'empty_response'
  | 'invalid_json'
  | 'schema_mismatch';

export type AiCallMeta = {
  action: string;
  provider: string;
  model: string;
  latencyMs: number;
  /** 1 on first-try success, 2 when the temperature-0 retry ran. */
  attempts: number;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
};

export type AiResult<T> =
  | { ok: true; data: T; raw: string; meta: AiCallMeta }
  | { ok: false; code: AiFailureCode; message: string; raw: string | null; meta: AiCallMeta };

export type CompleteOptions = {
  /** First-attempt temperature. The retry is always at 0. */
  temperature?: number;
  maxTokens?: number;
  /** Overrides the 30s default. */
  timeoutMs?: number;
  system?: string;
};

export const AI_TIMEOUT_MS = 30_000;
const DEFAULT_TEMPERATURE = 0.2;
const DEFAULT_MAX_TOKENS = 2000;

/* ───────────────────────────── JSON parsing ──────────────────────── */

/**
 * Models still wrap JSON in ```json fences or a sentence of preamble even when
 * told not to. Strip the fences, then fall back to the outermost {...} span.
 * Exported for tests.
 */
export function stripJsonFences(text: string): string {
  let out = text.trim();

  const fenced = out.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i);
  if (fenced) out = fenced[1].trim();
  else out = out.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  if (!out.startsWith('{') && !out.startsWith('[')) {
    const start = out.indexOf('{');
    const end = out.lastIndexOf('}');
    if (start !== -1 && end > start) out = out.slice(start, end + 1);
  }
  return out;
}

/* ────────────────────────────── The call ─────────────────────────── */

type RawCall = {
  content: string;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
};

/** One HTTP round-trip. Throws `CallError` — never surfaces to callers. */
class CallError extends Error {
  constructor(readonly code: AiFailureCode, message: string) {
    super(message);
    this.name = 'CallError';
  }
}

async function callOnce(
  config: AiConfig,
  prompt: string,
  temperature: number,
  opts: CompleteOptions,
): Promise<RawCall> {
  const messages: { role: 'system' | 'user'; content: string }[] = [];
  if (opts.system) messages.push({ role: 'system', content: opts.system });
  messages.push({ role: 'user', content: prompt });

  let res: Response;
  try {
    res = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature,
        max_tokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
      }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? AI_TIMEOUT_MS),
    });
  } catch (err) {
    const name = err instanceof Error ? err.name : '';
    if (name === 'TimeoutError' || name === 'AbortError')
      throw new CallError('timeout', `request exceeded ${opts.timeoutMs ?? AI_TIMEOUT_MS}ms`);
    throw new CallError('network', err instanceof Error ? err.message : String(err));
  }

  if (!res.ok) {
    // Body may carry the provider's reason; keep it server-side only.
    const body = await res.text().catch(() => '');
    throw new CallError('http_error', `HTTP ${res.status} ${res.statusText} ${body.slice(0, 300)}`.trim());
  }

  const payload = (await res.json().catch(() => null)) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  } | null;

  const content = payload?.choices?.[0]?.message?.content;
  if (!content || !content.trim()) throw new CallError('empty_response', 'model returned no content');

  return {
    content,
    promptTokens: payload?.usage?.prompt_tokens ?? null,
    completionTokens: payload?.usage?.completion_tokens ?? null,
    totalTokens: payload?.usage?.total_tokens ?? null,
  };
}

/**
 * Call the model and return JSON validated against `schema`.
 *
 * On malformed JSON or a schema mismatch it retries EXACTLY once at
 * temperature 0; a second failure returns a typed failure result. Transport
 * failures (timeout, network, HTTP) are not retried — retrying a 401 or a
 * blocked proxy just burns 30 more seconds.
 *
 * `action` is the grep key for the log line: `[ai.verify-skills] …`
 * (CODE_CONVENTIONS §3).
 */
export async function complete<T>(
  action: string,
  prompt: string,
  schema: ZodType<T>,
  opts: CompleteOptions = {},
): Promise<AiResult<T>> {
  const startedAt = Date.now();

  let config: AiConfig;
  try {
    config = getAiConfig();
  } catch (err) {
    const message = err instanceof AiConfigError ? err.message : String(err);
    console.error(`[ai.${action}] config_missing — ${message}`);
    return {
      ok: false,
      code: 'config_missing',
      message,
      raw: null,
      meta: {
        action,
        provider: 'unconfigured',
        model: 'unconfigured',
        latencyMs: Date.now() - startedAt,
        attempts: 0,
        promptTokens: null,
        completionTokens: null,
        totalTokens: null,
      },
    };
  }

  const baseMeta = { action, provider: config.provider, model: config.model };
  let lastRaw: string | null = null;
  let promptTokens: number | null = null;
  let completionTokens: number | null = null;
  let totalTokens: number | null = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const temperature = attempt === 1 ? (opts.temperature ?? DEFAULT_TEMPERATURE) : 0;

    let raw: RawCall;
    try {
      raw = await callOnce(config, prompt, temperature, opts);
    } catch (err) {
      const code = err instanceof CallError ? err.code : 'network';
      const message = err instanceof Error ? err.message : String(err);
      const latencyMs = Date.now() - startedAt;
      console.error(`[ai.${action}] ${code} — ${latencyMs}ms, attempt ${attempt}, model=${config.model} — ${message}`);
      return {
        ok: false,
        code,
        message,
        raw: lastRaw,
        meta: { ...baseMeta, latencyMs, attempts: attempt, promptTokens, completionTokens, totalTokens },
      };
    }

    lastRaw = raw.content;
    promptTokens = raw.promptTokens;
    completionTokens = raw.completionTokens;
    totalTokens = raw.totalTokens;

    const cleaned = stripJsonFences(raw.content);
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(cleaned);
    } catch {
      const latencyMs = Date.now() - startedAt;
      if (attempt === 1) {
        console.warn(`[ai.${action}] invalid_json — ${latencyMs}ms, retrying once at temperature 0`);
        continue;
      }
      console.error(`[ai.${action}] invalid_json — ${latencyMs}ms, 2 attempts, model=${config.model} — giving up`);
      return {
        ok: false,
        code: 'invalid_json',
        message: 'model did not return parseable JSON after a retry',
        raw: lastRaw,
        meta: { ...baseMeta, latencyMs, attempts: attempt, promptTokens, completionTokens, totalTokens },
      };
    }

    const validated = schema.safeParse(parsedJson);
    if (!validated.success) {
      const latencyMs = Date.now() - startedAt;
      const detail = validated.error.issues
        .slice(0, 3)
        .map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`)
        .join('; ');
      if (attempt === 1) {
        console.warn(`[ai.${action}] schema_mismatch — ${latencyMs}ms, retrying once at temperature 0 — ${detail}`);
        continue;
      }
      console.error(`[ai.${action}] schema_mismatch — ${latencyMs}ms, 2 attempts, model=${config.model} — ${detail}`);
      return {
        ok: false,
        code: 'schema_mismatch',
        message: detail || 'output did not match the expected schema',
        raw: lastRaw,
        meta: { ...baseMeta, latencyMs, attempts: attempt, promptTokens, completionTokens, totalTokens },
      };
    }

    const latencyMs = Date.now() - startedAt;
    console.info(
      `[ai.${action}] ok — ${latencyMs}ms, ${attempt} attempt(s), ${totalTokens ?? '?'} tokens, model=${config.model}, provider=${config.provider}`,
    );
    return {
      ok: true,
      data: validated.data,
      raw: raw.content,
      meta: { ...baseMeta, latencyMs, attempts: attempt, promptTokens, completionTokens, totalTokens },
    };
  }

  // Unreachable — the loop returns on every path. Kept for exhaustiveness.
  /* c8 ignore next */
  throw new Error('unreachable');
}
