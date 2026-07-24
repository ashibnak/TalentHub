// In-memory login rate limiter (phase 1 — no Redis). Keyed by email+IP: a fixed
// 15-minute window permits up to 5 failed attempts, then blocks. State is
// per-process and resets on redeploy — fine for the single-instance Railway
// deploy. Pure functions take `now` so they're unit-testable.

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

export const RATE_LIMIT = { WINDOW_MS, MAX_ATTEMPTS } as const;

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/** True once the key has reached MAX_ATTEMPTS failures inside the current window. */
export function isRateLimited(key: string, now: number = Date.now()): boolean {
  const b = buckets.get(key);
  if (!b || now >= b.resetAt) return false;
  return b.count >= MAX_ATTEMPTS;
}

/** Record one failed attempt, opening a fresh window if none is active. */
export function recordFailedAttempt(key: string, now: number = Date.now()): void {
  const b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  b.count += 1;
}

/** Clear a key's failures — called on a successful login. */
export function resetAttempts(key: string): void {
  buckets.delete(key);
}

/** Drop expired buckets so the Map can't grow unbounded. */
export function sweepExpired(now: number = Date.now()): void {
  for (const [key, b] of buckets) if (now >= b.resetAt) buckets.delete(key);
}

// Periodic sweep — guarded on globalThis so HMR doesn't stack intervals, and
// unref'd so it never keeps the process (or a test run) alive.
const g = globalThis as unknown as { _authRateSweep?: ReturnType<typeof setInterval> };
if (!g._authRateSweep) {
  g._authRateSweep = setInterval(() => sweepExpired(), WINDOW_MS);
  g._authRateSweep.unref?.();
}
