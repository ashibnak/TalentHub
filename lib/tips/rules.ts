/**
 * Tip-of-the-day selection — pure, no DB (lib/<domain>/rules.ts pattern).
 *
 * Deterministic on day-of-year, deliberately not random. Two consequences,
 * both intended:
 *   1. No daily authoring burden — a ~90-tip pool is three months of content
 *      written once, and the single admin never has to feed it.
 *   2. Everyone sees the SAME tip today, which makes it a talking point in the
 *      private launch group rather than isolated trivia.
 *
 * Random selection would break both: content would need topping up, and no two
 * people could compare notes.
 */
import { dayOfYearTehran, pickForDay } from '@/lib/daily';
import type { RoleBadge } from '@/lib/users/role-badge';

export type TipCategory = 'prompt_engineering' | 'ai_tools' | 'ai_in_domain' | 'platform';
export type TipAudience = 'builder' | 'domain_expert' | 'all';

export type Tip = {
  slug: string;
  category: TipCategory;
  audience: TipAudience;
  title: string;
  body: string;
};

/** How many tips the block can reveal: one shown, one behind "next tip". */
export const TIPS_PER_DAY = 2;

/** Which audience buckets a role_badge may see. Hybrid sees everything. */
export function audiencesFor(role: RoleBadge): TipAudience[] {
  if (role === 'builder') return ['all', 'builder'];
  if (role === 'domain_expert') return ['all', 'domain_expert'];
  return ['all', 'builder', 'domain_expert'];
}

/** The subset of the pool this role may be shown, in a stable order. */
export function filterByAudience(pool: readonly Tip[], role: RoleBadge): Tip[] {
  const allowed = new Set(audiencesFor(role));
  // Sorted by slug so the pool order never depends on DB row order — otherwise
  // "the same tip for everyone today" quietly stops being true.
  return pool.filter((t) => allowed.has(t.audience)).sort((a, b) => a.slug.localeCompare(b.slug));
}

/**
 * Today's tips for this role. Rotation maths lives in lib/daily.ts so the tip
 * and lesson pools can never drift apart. Empty pool → empty array, and the
 * block then renders nothing.
 */
export function pickTipsForDay(
  pool: readonly Tip[],
  role: RoleBadge,
  now: Date = new Date(),
  count: number = TIPS_PER_DAY,
): Tip[] {
  const filtered = filterByAudience(pool, role);
  if (filtered.length === 0) return [];

  return pickForDay(filtered, count, now);
}

/** Re-exported: the rotation primitive both daily pools share. */
export { dayOfYearTehran };
