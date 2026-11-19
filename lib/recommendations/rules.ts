/**
 * Adaptive learning recommendations — pure, no DB, no network
 * (lib/<domain>/rules.ts pattern).
 *
 * WHAT THIS IS NOT: it does not search the web and it never asks a model for a
 * link. An LLM asked for "an article about PyTorch" invents plausible URLs that
 * 404, which is strictly worse than showing nothing — see the URL policy in
 * scripts/seed-lessons.ts. Every candidate here comes from the curated pool
 * whose links are verified by `npm run lessons:check`.
 *
 * WHAT IT IS: a transparent scoring pass over that pool against signals the
 * platform already holds — claimed skills and their levels, verification gaps,
 * the stack of the member's own projects, domain expertise and role. Every
 * point a resource scores is attributable to one named reason, which is what
 * lets the UI say WHY something was suggested instead of "recommended for you".
 */
import type { RoleBadge } from '@/lib/users/role-badge';
import type { Lesson, LessonLevel } from '@/lib/lessons/rules';

/* ────────────────────────────── Signals in ───────────────────────── */

export type SkillSignal = {
  slug: string;
  /** 1-5 self-assessed. Drives which LEVEL of content fits. */
  claimedLevel: number;
  verified: boolean;
};

export type UserSignals = {
  role: RoleBadge;
  skills: SkillSignal[];
  /** Domain slugs from user_domain_expertise. */
  domains: string[];
  /** Skill slugs used across the member's own projects. */
  projectSkills: string[];
  /**
   * Skill slugs the AI verification run could NOT evidence. The strongest
   * signal available: the platform has told this member "we couldn't verify X",
   * so the single most useful thing it can do next is teach X.
   */
  verificationGaps: string[];
};

/* ─────────────────────────── Scoring weights ─────────────────────── */

/**
 * The one product knob. Ordered by how directly each signal answers "what
 * should this person learn next":
 *
 *  - a verification gap is the platform's own unmet promise, so it dominates;
 *  - a skill claimed at a low level is an explicit "I am still learning this";
 *  - project stack is what they actually touch day to day;
 *  - domain matches serve the Domain Expert, who has few skill signals;
 *  - role/level fit are tie-breakers, not drivers.
 */
export const WEIGHTS = {
  verificationGap: 50,
  lowLevelSkill: 20,
  projectSkill: 15,
  claimedSkill: 10,
  domainMatch: 12,
  levelFit: 8,
  roleFit: 5,
} as const;

/** At or below this claimed level, a skill reads as "still learning". */
export const LEARNING_LEVEL_MAX = 3;

/** How many suggestions the block shows. */
export const RECOMMENDATION_COUNT = 3;

/* ──────────────────────────── Scoring out ────────────────────────── */

/** A single attributable reason a resource scored — the UI renders these. */
export type MatchReason =
  | { kind: 'verification_gap'; topic: string }
  | { kind: 'low_level_skill'; topic: string }
  | { kind: 'project_skill'; topic: string }
  | { kind: 'claimed_skill'; topic: string }
  | { kind: 'domain'; topic: string }
  | { kind: 'level_fit'; level: LessonLevel }
  | { kind: 'role_fit' };

export type ScoredLesson = { lesson: Lesson; score: number; reasons: MatchReason[] };

/**
 * The level a member is ready for, from their strongest relevant claim.
 *
 * Deliberately conservative: someone with no signal at all gets `beginner`, and
 * `advanced` needs a level-4+ claim. Suggesting advanced material to a beginner
 * is the fastest way to make this block feel useless.
 */
export function readinessLevel(signals: UserSignals): LessonLevel {
  if (signals.skills.length === 0) return 'beginner';
  const top = Math.max(...signals.skills.map((s) => s.claimedLevel));
  if (top >= 4) return 'advanced';
  if (top >= 2) return 'intermediate';
  return 'beginner';
}

/** Case-insensitive topic membership — pool topics are authored by hand. */
function has(haystack: readonly string[], needle: string): boolean {
  const n = needle.toLowerCase();
  return haystack.some((h) => h.toLowerCase() === n);
}

/**
 * Score ONE resource against the signals, collecting every reason it matched.
 *
 * A resource with zero topic overlap can still score on level/role fit, but
 * `recommend` below filters those out — generic filler is what makes a
 * recommendations block ignorable.
 */
export function scoreLesson(lesson: Lesson & { topics: string[] }, signals: UserSignals): ScoredLesson {
  const reasons: MatchReason[] = [];
  let score = 0;

  for (const gap of signals.verificationGaps) {
    if (has(lesson.topics, gap)) {
      score += WEIGHTS.verificationGap;
      reasons.push({ kind: 'verification_gap', topic: gap });
    }
  }

  for (const skill of signals.skills) {
    if (!has(lesson.topics, skill.slug)) continue;
    if (skill.claimedLevel <= LEARNING_LEVEL_MAX && !skill.verified) {
      score += WEIGHTS.lowLevelSkill;
      reasons.push({ kind: 'low_level_skill', topic: skill.slug });
    } else {
      score += WEIGHTS.claimedSkill;
      reasons.push({ kind: 'claimed_skill', topic: skill.slug });
    }
  }

  for (const ps of signals.projectSkills) {
    if (has(lesson.topics, ps)) {
      score += WEIGHTS.projectSkill;
      reasons.push({ kind: 'project_skill', topic: ps });
    }
  }

  for (const domain of signals.domains) {
    if (has(lesson.topics, domain)) {
      score += WEIGHTS.domainMatch;
      reasons.push({ kind: 'domain', topic: domain });
    }
  }

  if (lesson.level === readinessLevel(signals)) {
    score += WEIGHTS.levelFit;
    reasons.push({ kind: 'level_fit', level: lesson.level });
  }

  // Audience 'all' is neutral — only a deliberate persona match earns the point.
  if (
    (signals.role === 'builder' && lesson.audience === 'builder') ||
    (signals.role === 'domain_expert' && lesson.audience === 'domain_expert')
  ) {
    score += WEIGHTS.roleFit;
    reasons.push({ kind: 'role_fit' });
  }

  return { lesson, score, reasons };
}

/** True when a resource is visible to this role at all. */
function audienceAllows(lesson: Lesson, role: RoleBadge): boolean {
  if (lesson.audience === 'all') return true;
  if (role === 'hybrid') return true;
  return lesson.audience === role;
}

/**
 * Rank the pool for this member and return the top `count`.
 *
 * Two hard rules:
 *  1. A resource with NO topic-based reason is dropped, however well it fits on
 *     level or role. Padding the list with generic content is how a
 *     recommendations block trains people to ignore it.
 *  2. `exclude` drops anything already shown elsewhere on the page (the shared
 *     "lesson of the day"), so the two blocks never duplicate each other.
 *
 * Ties break by slug so the order is stable between renders — a list that
 * reshuffles on refresh looks broken.
 */
export function recommend(
  pool: readonly (Lesson & { topics: string[] })[],
  signals: UserSignals,
  opts: { count?: number; exclude?: readonly string[] } = {},
): ScoredLesson[] {
  const count = opts.count ?? RECOMMENDATION_COUNT;
  const excluded = new Set(opts.exclude ?? []);

  const topicReasons = new Set<MatchReason['kind']>([
    'verification_gap',
    'low_level_skill',
    'project_skill',
    'claimed_skill',
    'domain',
  ]);

  return pool
    .filter((l) => !excluded.has(l.slug) && audienceAllows(l, signals.role))
    .map((l) => scoreLesson(l, signals))
    .filter((s) => s.reasons.some((r) => topicReasons.has(r.kind)))
    .sort((a, b) => b.score - a.score || a.lesson.slug.localeCompare(b.lesson.slug))
    .slice(0, count);
}

/**
 * The single strongest reason, for the one-line Persian explanation the card
 * shows. Ordered by the same priority as WEIGHTS.
 */
export function primaryReason(scored: ScoredLesson): MatchReason | null {
  const order: MatchReason['kind'][] = [
    'verification_gap',
    'low_level_skill',
    'project_skill',
    'domain',
    'claimed_skill',
    'level_fit',
    'role_fit',
  ];
  for (const kind of order) {
    const hit = scored.reasons.find((r) => r.kind === kind);
    if (hit) return hit;
  }
  return null;
}
