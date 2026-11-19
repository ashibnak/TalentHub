import { z } from 'zod';
import { DAY_MS, tehranDaysBetween } from '@/lib/leaderboard/scoring';

/**
 * Weekly Spotlight cycle rules — pure, no DB (same shape as
 * lib/upvotes/rules.ts and lib/submissions/rules.ts).
 *
 * The cycle (PROJECT_PLAN §3.5): an admin spotlights an existing active
 * problem for seven days; members submit against it; when the window closes the
 * admin picks a winner, who gets the seeded 'spotlight-solver' badge and the
 * 50-point leaderboard weight. Spotlight never creates a problem — it only
 * raises one that already exists.
 *
 * All Tehran calendar math is delegated to lib/leaderboard/scoring.ts; the
 * +03:30 offset must not be written a second time.
 */

export const SPOTLIGHT_DAYS = 7;

/** The problem fields these rules need — a narrow view of `challenge_problems`. */
export type SpotlightProblem = {
  id: string;
  status: 'pending_review' | 'active' | 'resolved' | 'archived' | 'rejected';
  isSpotlight: boolean;
  spotlightEndsAt: Date | null;
  spotlightWinnerProjectId: string | null;
};

/* ─────────────────────────── Action input schemas ────────────────── */

export const StartSpotlightSchema = z.object({ problemId: z.uuid() });
export const EndSpotlightSchema = z.object({ problemId: z.uuid() });
export const PickWinnerSchema = z.object({ problemId: z.uuid(), projectId: z.uuid() });

/* ──────────────────────────── Starting a cycle ───────────────────── */

export type SpotlightRejection =
  | 'problem_not_found'
  | 'problem_not_active'
  | 'already_spotlight'
  | 'spotlight_taken';

/**
 * Whether `problem` may be spotlighted right now.
 *
 * Two invariants:
 *  1. Only an ACTIVE problem — spotlighting something pending review, resolved
 *     or archived would point everyone at a dead end.
 *  2. ONE spotlight platform-wide. DESIGN_SYSTEM §5.8 is explicit that the
 *     banner must never stack, and the banner is downstream of this rule: if
 *     two problems could be spotlighted, the home page would have to choose
 *     one arbitrarily or render two. The constraint belongs here, not in CSS.
 *
 * `currentSpotlight` is whatever is spotlighted now, or null.
 */
export function canSpotlight(
  problem: SpotlightProblem | null,
  currentSpotlight: { id: string } | null,
): SpotlightRejection | null {
  if (!problem) return 'problem_not_found';
  if (problem.status !== 'active') return 'problem_not_active';
  if (currentSpotlight?.id === problem.id) return 'already_spotlight';
  if (currentSpotlight) return 'spotlight_taken';
  return null;
}

export type SpotlightWindow = { startsAt: Date; endsAt: Date };

/** The seven-day window a spotlight opens at `now`. */
export function spotlightWindow(now: Date = new Date()): SpotlightWindow {
  return { startsAt: now, endsAt: new Date(now.getTime() + SPOTLIGHT_DAYS * DAY_MS) };
}

/* ──────────────────────────── Live state ─────────────────────────── */

/** True once the window has closed. A problem that was never spotlighted is not expired. */
export function isExpired(problem: Pick<SpotlightProblem, 'spotlightEndsAt'>, now: Date = new Date()): boolean {
  if (!problem.spotlightEndsAt) return false;
  return problem.spotlightEndsAt.getTime() <= now.getTime();
}

/**
 * Whole Tehran calendar days left, floored at 0.
 *
 * Counted in CALENDAR days, not 24-hour chunks: a member reading «۱ روز باقی
 * مانده» at 23:00 Tehran means "it ends tomorrow", and raw hour arithmetic
 * would say 0 while the banner is still live. Returns 0 on the final day.
 */
export function daysRemaining(problem: Pick<SpotlightProblem, 'spotlightEndsAt'>, now: Date = new Date()): number {
  if (!problem.spotlightEndsAt) return 0;
  return Math.max(0, tehranDaysBetween(now, problem.spotlightEndsAt));
}

/* ──────────────────────────── Picking a winner ───────────────────── */

export type WinnerRejection =
  | 'problem_not_found'
  | 'not_spotlighted'
  | 'window_open'
  | 'project_not_linked'
  | 'winner_already_picked';

/**
 * Whether `projectId` may be crowned winner of `problem`.
 *
 * The winning project MUST already be linked to this problem via
 * `project_challenge_problems` — the badge and the 50 points are a reward for
 * having actually submitted, so an unlinked project id (a typo, a stale form,
 * a hand-crafted POST) is rejected outright rather than silently accepted.
 *
 * The window must also have closed: crowning mid-week would end the contest
 * early for everyone still working on it.
 */
export function canPickWinner(
  problem: SpotlightProblem | null,
  projectId: string,
  linkedProjectIds: readonly string[],
  now: Date = new Date(),
): WinnerRejection | null {
  if (!problem) return 'problem_not_found';
  if (!problem.spotlightEndsAt) return 'not_spotlighted';
  if (problem.spotlightWinnerProjectId) return 'winner_already_picked';
  if (!isExpired(problem, now)) return 'window_open';
  if (!linkedProjectIds.includes(projectId)) return 'project_not_linked';
  return null;
}
