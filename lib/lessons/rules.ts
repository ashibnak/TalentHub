/**
 * Lesson-of-the-day selection — pure, no DB (lib/<domain>/rules.ts pattern).
 *
 * Same deterministic day-of-year rotation as the tip pool (lib/daily.ts), so
 * everyone sees the same lesson today and the pool is authored once.
 *
 * A lesson differs from a tip in one important way: it points OFF-platform. The
 * URL is the field that rots — providers retire and move courses — so the pool
 * needs re-checking before each launch, and `provider` + `title` are kept
 * accurate enough that a dead link is still findable by search.
 */
import { pickForDay } from '@/lib/daily';
import type { RoleBadge } from '@/lib/users/role-badge';
import type { TipAudience } from '@/lib/tips/rules';

export type LessonLevel = 'beginner' | 'intermediate' | 'advanced';
export type LessonKind = 'course' | 'article' | 'doc' | 'tip';

/** Persian labels for what a resource IS (§7.5 — describes content to the reader). */
export const LESSON_KIND_LABEL_FA: Record<LessonKind, string> = {
  course: 'دوره',
  article: 'مقاله',
  doc: 'مستند',
  tip: 'نکته',
};

export type Lesson = {
  slug: string;
  provider: string;
  title: string;
  description: string;
  /** Null only for `kind: 'tip'` — inline advice has nowhere to link. */
  url: string | null;
  kind: LessonKind;
  level: LessonLevel;
  audience: TipAudience;
  durationMinutes: number | null;
  /** Skill slugs / keywords this resource teaches — the recommender's match key. */
  topics: string[];
};

/** One lesson shown, one behind the "next" control — same shape as tips. */
export const LESSONS_PER_DAY = 2;

/** Persian level labels. Levels describe content TO the reader, so §7.5 → Persian. */
export const LESSON_LEVEL_LABEL_FA: Record<LessonLevel, string> = {
  beginner: 'مقدماتی',
  intermediate: 'متوسط',
  advanced: 'پیشرفته',
};

/** Which audience buckets a role_badge may see. Hybrid sees everything. */
export function audiencesFor(role: RoleBadge): TipAudience[] {
  if (role === 'builder') return ['all', 'builder'];
  if (role === 'domain_expert') return ['all', 'domain_expert'];
  return ['all', 'builder', 'domain_expert'];
}

/**
 * The subset of the pool this role may be shown, in a stable order.
 * Sorted by slug so DB row order can never change what "today" means.
 */
export function filterByAudience(pool: readonly Lesson[], role: RoleBadge): Lesson[] {
  const allowed = new Set(audiencesFor(role));
  return pool.filter((l) => allowed.has(l.audience)).sort((a, b) => a.slug.localeCompare(b.slug));
}

/** Today's lessons for this role. Empty pool → empty array; block renders nothing. */
export function pickLessonsForDay(
  pool: readonly Lesson[],
  role: RoleBadge,
  now: Date = new Date(),
  count: number = LESSONS_PER_DAY,
): Lesson[] {
  return pickForDay(filterByAudience(pool, role), count, now);
}
