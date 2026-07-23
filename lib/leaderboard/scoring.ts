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

const TEHRAN_OFFSET_MIN = 3 * 60 + 30; // +03:30, no DST
const DAY_MS = 86_400_000;

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
  // Shift the instant into "Tehran wall clock" so UTC getters read local fields.
  const wall = new Date(now.getTime() + TEHRAN_OFFSET_MIN * 60_000);
  const dow = wall.getUTCDay(); // 0=Sun … 6=Sat
  const daysSinceSat = (dow + 1) % 7; // Sat→0, Sun→1, … Fri→6
  // Midnight (Tehran) of this week's Saturday, expressed as a wall-clock instant…
  const satWall = Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate()) - daysSinceSat * DAY_MS;
  // …then convert that wall clock back to a real UTC instant.
  const startMs = satWall - TEHRAN_OFFSET_MIN * 60_000 + offset * 7 * DAY_MS;
  return { offset, start: new Date(startMs), end: new Date(startMs + 7 * DAY_MS) };
}
