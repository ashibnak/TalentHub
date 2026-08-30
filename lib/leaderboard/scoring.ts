/**
 * Weekly leaderboard scoring + week-boundary math.
 *
 * Pure functions only (no DB) so they're unit-testable and shared by both the
 * live board query and the admin "freeze week" action.
 *
 * WEEK: Saturday 00:00 → next Saturday 00:00, in Asia/Tehran. Saturday is the
 * first day of the Iranian work week and matches the plan's Spotlight cadence.
 * Iran abolished DST in 2022, so a fixed +03:30 offset is correct for phase 1;
 * revisit if that ever changes.
 *
 * The point weights are the one product knob — tune here, nowhere else.
 */

export type LeaderboardGroup = 'builder' | 'domain_expert' | 'hybrid';

/** Fixed tab order; all three always render (Domain Experts must feel first-class). */
export const GROUP_ORDER: readonly LeaderboardGroup[] = ['builder', 'domain_expert', 'hybrid'] as const;

/** Persian group labels — match the persona wording already used on the landing page. */
export const GROUP_LABEL_FA: Record<LeaderboardGroup, string> = {
  builder: 'سازنده‌ها',
  domain_expert: 'متخصص‌های حوزه‌ای',
  hybrid: 'ترکیبی',
};

/** Contribution point weights. Rewards shipping + solving challenges over social signal. */
export const POINTS = {
  publishProject: 10, // published a project this week
  challengeSubmission: 15, // linked a project to a challenge problem this week
  upvoteReceived: 2, // each upvote received on your projects this week
  spotlightWin: 50, // won a weekly Spotlight decided this week
} as const;

export type ScoreBreakdown = {
  publishProject: number;
  challengeSubmission: number;
  upvoteReceived: number;
  spotlightWin: number;
};

export const EMPTY_BREAKDOWN: ScoreBreakdown = {
  publishProject: 0,
  challengeSubmission: 0,
  upvoteReceived: 0,
  spotlightWin: 0,
};

/** Total weighted score from a per-action count breakdown. */
export function scoreFromBreakdown(b: ScoreBreakdown): number {
  return (
    b.publishProject * POINTS.publishProject +
    b.challengeSubmission * POINTS.challengeSubmission +
    b.upvoteReceived * POINTS.upvoteReceived +
    b.spotlightWin * POINTS.spotlightWin
  );
}

/** +03:30, no DST (Iran abolished it in 2022). The ONE place this offset lives. */
export const TEHRAN_OFFSET_MIN = 3 * 60 + 30;
export const DAY_MS = 86_400_000;

/**
 * Midnight (Tehran) of the calendar day containing `instant`, as a UTC instant.
 *
 * The shared primitive for every "which Tehran day is this?" question —
 * `weekWindow` below and the Spotlight countdown both build on it, so the
 * offset arithmetic is never written twice.
 */
export function tehranStartOfDay(instant: Date): Date {
  // Shift into "Tehran wall clock" so the UTC getters read local calendar fields.
  const wall = new Date(instant.getTime() + TEHRAN_OFFSET_MIN * 60_000);
  const midnightWall = Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate());
  // …then convert that wall clock back to a real UTC instant.
  return new Date(midnightWall - TEHRAN_OFFSET_MIN * 60_000);
}

/** Whole Tehran calendar days from `from` to `to` (negative when `to` is past). */
export function tehranDaysBetween(from: Date, to: Date): number {
  const ms = tehranStartOfDay(to).getTime() - tehranStartOfDay(from).getTime();
  return Math.round(ms / DAY_MS);
}

export type WeekWindow = {
  offset: number; // 0 = current in-progress week, -1 = last (just-closed) week, ...
  start: Date; // inclusive (Saturday 00:00 Tehran, as a UTC instant)
  end: Date; // exclusive (next Saturday 00:00 Tehran)
};

/**
 * The Saturday→Saturday window containing `now`, shifted by `offset` weeks.
 * offset 0 = the week `now` falls in; -1 = the previous week; etc.
 */
export function weekWindow(offset = 0, now: Date = new Date()): WeekWindow {
  const wall = new Date(now.getTime() + TEHRAN_OFFSET_MIN * 60_000);
  const daysSinceSat = (wall.getUTCDay() + 1) % 7; // Sat→0, Sun→1, … Fri→6
  // Back up to this week's Saturday midnight (Tehran), then shift by `offset` weeks.
  const startMs = tehranStartOfDay(now).getTime() - daysSinceSat * DAY_MS + offset * 7 * DAY_MS;
  return { offset, start: new Date(startMs), end: new Date(startMs + 7 * DAY_MS) };
}
