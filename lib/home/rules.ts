/**
 * Home-dashboard display rules — pure, no DB (lib/<domain>/rules.ts pattern).
 *
 * The page is ordered by TIME PRESSURE, not importance: deadlines at the top,
 * evergreen content at the bottom. These helpers decide what the
 * pressure-sensitive middle blocks are allowed to say.
 */

/** Counts that decide whether this member has anything to show yet. */
export type ContributionCounts = { projectCount: number; ideaCount: number };

/**
 * Day-one state: no projects AND no ideas.
 *
 * A dashboard of zeros is the worst possible first impression, and this screen
 * directly affects the plan's ≥85% onboarding-completion target — so the stats,
 * AI-analysis and similar-people blocks are replaced by onboarding cards rather
 * than rendered empty. AND, not OR: someone with one idea and no project has
 * real numbers to look at.
 */
export function isDayOne(counts: ContributionCounts): boolean {
  return counts.projectCount === 0 && counts.ideaCount === 0;
}

export type RankStanding = {
  /** 1-based rank within the member's role_badge group. */
  rank: number;
  score: number;
  /** Score of the member one rank above, if any. */
  scoreAhead: number | null;
};

export type Milestone = { pointsNeeded: number; targetRank: number };

/**
 * Points needed to overtake the next person up, or null when the line should be
 * omitted entirely.
 *
 * Omitted at rank 1 (nothing above to chase) and at zero score (a member who
 * hasn't contributed this week needs an invitation, not a gap-to-close).
 *
 * A TIE still yields 1: tied on score but ranked below means one more point
 * genuinely overtakes them. Only impossible data — the person above scoring
 * LESS — is omitted, so "با ۰ امتیاز دیگر…" can never render.
 */
export function nextRankMilestone(standing: RankStanding): Milestone | null {
  if (standing.rank <= 1) return null;
  if (standing.score <= 0) return null;
  if (standing.scoreAhead === null) return null;

  const pointsNeeded = standing.scoreAhead - standing.score + 1;
  if (pointsNeeded <= 0) return null;

  return { pointsNeeded, targetRank: standing.rank - 1 };
}

/**
 * Week-over-week delta for the contribution score. Returned separately from the
 * score so the card can style a rise and a fall differently; 0 means unchanged,
 * which the UI shows as no delta rather than "±۰".
 */
export function scoreDelta(thisWeek: number, lastWeek: number): number {
  return thisWeek - lastWeek;
}

export type SkillGap = { skillSlug: string; skillName: string; evidence: string };

/**
 * The single most useful thing to say about a verification run: the claimed
 * skill with the LOWEST confidence that did not clear the bar.
 *
 * Counts alone ("۳ از ۵ مهارت تأیید شد") are useless — the member already knows
 * the number. The weakest skill plus the model's own reason for rejecting it is
 * the only part that suggests a next action. Returns null when everything
 * passed, which the UI treats as "nothing to fix".
 */
export function weakestUnverified(
  verifications: readonly { skill_slug: string; confidence: number; evidence: string; verdict: string }[],
  threshold: number,
  slugToName: ReadonlyMap<string, string>,
): SkillGap | null {
  const failing = verifications.filter((v) => v.confidence < threshold);
  if (failing.length === 0) return null;

  const weakest = failing.reduce((lo, v) => (v.confidence < lo.confidence ? v : lo));
  return {
    skillSlug: weakest.skill_slug,
    skillName: slugToName.get(weakest.skill_slug) ?? weakest.skill_slug,
    evidence: weakest.evidence,
  };
}
