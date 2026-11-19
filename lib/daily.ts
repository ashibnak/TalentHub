/**
 * Deterministic daily rotation, shared by the tip and lesson pools.
 *
 * Selection is `dayOfYear % poolSize`, never random. Two consequences, both
 * intended: the admin writes a pool ONCE instead of feeding a daily slot, and
 * everyone sees the same item today — which makes it a talking point in the
 * launch group rather than isolated trivia.
 */

/**
 * Day-of-year in Asia/Tehran (1-366).
 *
 * Tehran, not UTC, so the rotation flips at local midnight rather than 03:30 —
 * someone opening the app at 1am should already be on today's item. Same fixed
 * +03:30 offset the leaderboard uses; no date library.
 */
export function dayOfYearTehran(now: Date = new Date()): number {
  const TEHRAN_OFFSET_MS = (3 * 60 + 30) * 60_000;
  const wall = new Date(now.getTime() + TEHRAN_OFFSET_MS);
  const startOfYear = Date.UTC(wall.getUTCFullYear(), 0, 1);
  const startOfDay = Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate());
  return Math.floor((startOfDay - startOfYear) / 86_400_000) + 1;
}

/**
 * Today's slice of a pool: start at `dayOfYear % size`, then take the next
 * items in order, wrapping so the last day of a cycle still gets a full set
 * rather than a short one. Empty pool → empty result.
 *
 * `pool` MUST already be in a stable order (sort by slug at the call site) —
 * otherwise "the same item for everyone today" quietly stops being true when
 * the DB returns rows in a different order.
 */
export function pickForDay<T>(pool: readonly T[], count: number, now: Date = new Date()): T[] {
  if (pool.length === 0) return [];
  const start = dayOfYearTehran(now) % pool.length;
  const take = Math.min(count, pool.length);
  return Array.from({ length: take }, (_, i) => pool[(start + i) % pool.length]);
}
