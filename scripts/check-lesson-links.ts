/**
 * Verify every lesson URL is reachable. Run: `npm run lessons:check`
 *
 * The lesson pool points off-platform, so it rots on someone else's schedule:
 * providers retire courses, move catalogues and rename paths without notice.
 * Nothing in the app can detect that, so this is the only guard — run it before
 * each launch and whenever a lesson is added.
 *
 * Exits non-zero when any link fails, so it can gate a deploy if wanted.
 */
import { LESSON_POOL } from './seed-lessons';

const TIMEOUT_MS = 15_000;

type Result = { slug: string; url: string; status: number | string; ok: boolean };

async function check(url: string): Promise<{ status: number | string; ok: boolean }> {
  try {
    // Some providers reject HEAD or bot-ish agents; GET with a browser UA is
    // the closest thing to what a member's click will actually do.
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; AIGraph-link-check/1.0)' },
    });
    return { status: res.status, ok: res.ok };
  } catch (err) {
    const name = err instanceof Error ? err.name : 'error';
    return { status: name === 'TimeoutError' ? 'timeout' : 'network', ok: false };
  }
}

async function main() {
  console.log(`[lessons:check] checking ${LESSON_POOL.length} links…\n`);

  const results: Result[] = [];
  // Small concurrency — polite to providers, still fast enough.
  // Entries with no url (kind='tip') have nothing to check.
  const queue = LESSON_POOL.filter((l): l is typeof l & { url: string } => !!l.url);
  const workers = Array.from({ length: 5 }, async () => {
    for (;;) {
      const lesson = queue.shift();
      if (!lesson) return;
      const { status, ok } = await check(lesson.url);
      results.push({ slug: lesson.slug, url: lesson.url, status, ok });
      console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${String(status).padEnd(8)} ${lesson.slug}`);
    }
  });
  await Promise.all(workers);

  const failed = results.filter((r) => !r.ok);
  console.log(`\n[lessons:check] ${results.length - failed.length}/${results.length} reachable`);
  if (failed.length) {
    console.log('[lessons:check] FAILING LINKS — fix or remove before launch:');
    for (const f of failed) console.log(`  ${f.slug}  ${f.status}  ${f.url}`);
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('[lessons:check] failed:', err);
  process.exit(1);
});
