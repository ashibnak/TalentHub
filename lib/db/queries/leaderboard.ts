import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { and, eq, gte, isNotNull, lt, ne, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import {
  users,
  skills,
  userSkills,
  userDomainExpertise,
  projects,
  projectChallengeProblems,
  projectUpvotes,
  challengeProblems,
  leaderboardSnapshots,
  orgs,
  badges,
  userBadges,
} from '@/lib/db/schema';
import { computeRoleBadge } from '@/lib/users/role-badge';
import {
  GROUP_ORDER,
  EMPTY_BREAKDOWN,
  scoreFromBreakdown,
  weekWindow,
  type LeaderboardGroup,
  type ScoreBreakdown,
  type WeekWindow,
} from '@/lib/leaderboard/scoring';

const MAIN_ORG_SLUG = 'main-org'; // phase-1 single org (see CODE_CONVENTIONS §4)
const TOP_BADGE_SLUG = 'top-of-the-week';

export type LeaderboardEntry = {
  userId: string;
  username: string;
  name: string;
  roleTitle: string | null;
  avatarUrl: string | null;
  group: LeaderboardGroup;
  rank: number;
  score: number;
  breakdown: ScoreBreakdown;
};

export type LeaderboardResult = {
  window: WeekWindow;
  frozen: boolean; // true when read from a frozen snapshot (a closed week)
  groups: Record<LeaderboardGroup, LeaderboardEntry[]>;
};

type Db = ReturnType<typeof getDb>;

const emptyGroups = (): Record<LeaderboardGroup, LeaderboardEntry[]> => ({
  builder: [],
  domain_expert: [],
  hybrid: [],
});

/** Group entries by their role_badge, sort each group by score desc (ties by name), assign 1-based ranks. */
function rankIntoGroups(entries: Omit<LeaderboardEntry, 'rank'>[]): Record<LeaderboardGroup, LeaderboardEntry[]> {
  const groups = emptyGroups();
  for (const e of entries) (groups[e.group] as Omit<LeaderboardEntry, 'rank'>[]).push(e);
  for (const g of GROUP_ORDER) {
    const list = groups[g] as (Omit<LeaderboardEntry, 'rank'> & { rank?: number })[];
    list.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
    list.forEach((e, i) => (e.rank = i + 1));
  }
  return groups;
}

/** Sum per-user rows into a Map<userId, count>. */
function toCountMap(rows: { userId: string; value: number }[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) m.set(r.userId, Number(r.value));
  return m;
}

/**
 * Live-compute standings for a week window from raw timestamps. Used for the
 * in-progress week and as a fallback for closed weeks that were never frozen.
 */
export async function computeStandings(window: WeekWindow): Promise<LeaderboardResult> {
  const db = getDb();
  const { start, end } = window;

  const baseUsers = await db
    .select({
      id: users.id,
      username: users.username,
      name: users.name,
      roleTitle: users.roleTitle,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(and(eq(users.status, 'active'), eq(users.isAdmin, false), isNotNull(users.username)));
  if (baseUsers.length === 0) return { window, frozen: false, groups: emptyGroups() };

  const inWindow = (col: Parameters<typeof gte>[0]) => and(gte(col, start), lt(col, end));

  const [techRows, domainRows, publishRows, submissionRows, upvoteRows, spotlightRows] = await Promise.all([
    // technical-skill count per user (excludes ai_tool) → drives role_badge
    db
      .select({ userId: userSkills.userId, value: sql<number>`cast(count(*) as int)` })
      .from(userSkills)
      .innerJoin(skills, eq(userSkills.skillId, skills.id))
      .where(ne(skills.category, 'ai_tool'))
      .groupBy(userSkills.userId),
    db
      .select({ userId: userDomainExpertise.userId, value: sql<number>`cast(count(*) as int)` })
      .from(userDomainExpertise)
      .groupBy(userDomainExpertise.userId),
    // projects published this week
    db
      .select({ userId: projects.userId, value: sql<number>`cast(count(*) as int)` })
      .from(projects)
      .where(and(eq(projects.status, 'published'), inWindow(projects.createdAt)))
      .groupBy(projects.userId),
    // projects linked to a challenge problem this week
    db
      .select({ userId: projects.userId, value: sql<number>`cast(count(*) as int)` })
      .from(projectChallengeProblems)
      .innerJoin(projects, eq(projectChallengeProblems.projectId, projects.id))
      .where(inWindow(projectChallengeProblems.createdAt))
      .groupBy(projects.userId),
    // upvotes received this week (self-upvotes excluded)
    db
      .select({ userId: projects.userId, value: sql<number>`cast(count(*) as int)` })
      .from(projectUpvotes)
      .innerJoin(projects, eq(projectUpvotes.projectId, projects.id))
      .where(and(inWindow(projectUpvotes.createdAt), ne(projectUpvotes.userId, projects.userId)))
      .groupBy(projects.userId),
    // spotlights decided this week, credited to the winning project's owner
    db
      .select({ userId: projects.userId, value: sql<number>`cast(count(*) as int)` })
      .from(challengeProblems)
      .innerJoin(projects, eq(challengeProblems.spotlightWinnerProjectId, projects.id))
      .where(and(isNotNull(challengeProblems.spotlightWinnerProjectId), inWindow(challengeProblems.spotlightEndsAt)))
      .groupBy(projects.userId),
  ]);

  const techByUser = toCountMap(techRows);
  const domainByUser = toCountMap(domainRows);
  const publishByUser = toCountMap(publishRows);
  const submissionByUser = toCountMap(submissionRows);
  const upvoteByUser = toCountMap(upvoteRows);
  const spotlightByUser = toCountMap(spotlightRows);

  const entries: Omit<LeaderboardEntry, 'rank'>[] = [];
  for (const u of baseUsers) {
    const breakdown: ScoreBreakdown = {
      publishProject: publishByUser.get(u.id) ?? 0,
      challengeSubmission: submissionByUser.get(u.id) ?? 0,
      upvoteReceived: upvoteByUser.get(u.id) ?? 0,
      spotlightWin: spotlightByUser.get(u.id) ?? 0,
    };
    const score = scoreFromBreakdown(breakdown);
    if (score <= 0) continue; // only surface people who contributed this week
    entries.push({
      userId: u.id,
      username: u.username!,
      name: u.name,
      roleTitle: u.roleTitle,
      avatarUrl: u.avatarUrl,
      group: computeRoleBadge({ technicalSkillCount: techByUser.get(u.id) ?? 0, domainCount: domainByUser.get(u.id) ?? 0 }),
      score,
      breakdown,
    });
  }

  return { window, frozen: false, groups: rankIntoGroups(entries) };
}

const getMainOrgId = cache(async (): Promise<string | null> => {
  const [org] = await getDb().select({ id: orgs.id }).from(orgs).where(eq(orgs.slug, MAIN_ORG_SLUG)).limit(1);
  return org?.id ?? null;
});

/** Read a frozen week from snapshot rows (joined to users for fresh display fields). Null if the week was never frozen. */
async function readSnapshot(window: WeekWindow): Promise<LeaderboardResult | null> {
  const db = getDb();
  const orgId = await getMainOrgId();
  if (!orgId) return null;

  const rows = await db
    .select({
      userId: leaderboardSnapshots.userId,
      username: users.username,
      name: users.name,
      roleTitle: users.roleTitle,
      avatarUrl: users.avatarUrl,
      group: leaderboardSnapshots.groupType,
      rank: leaderboardSnapshots.rank,
      score: leaderboardSnapshots.score,
      breakdown: leaderboardSnapshots.breakdown,
    })
    .from(leaderboardSnapshots)
    .innerJoin(users, eq(leaderboardSnapshots.userId, users.id))
    .where(and(eq(leaderboardSnapshots.orgId, orgId), eq(leaderboardSnapshots.weekStart, window.start)));
  if (rows.length === 0) return null;

  const groups = emptyGroups();
  for (const r of rows) {
    if (!r.username) continue;
    groups[r.group].push({
      userId: r.userId,
      username: r.username,
      name: r.name,
      roleTitle: r.roleTitle,
      avatarUrl: r.avatarUrl,
      group: r.group,
      rank: r.rank,
      score: r.score,
      breakdown: { ...EMPTY_BREAKDOWN, ...r.breakdown },
    });
  }
  for (const g of GROUP_ORDER) groups[g].sort((a, b) => a.rank - b.rank);
  return { window, frozen: true, groups };
}

/**
 * Cross-request cache of the *current* week's standings — the hot anonymous
 * path (the 7 aggregate queries in computeStandings). Only the JSON-safe
 * groups/frozen are cached; the week window (Dates) is recomputed by the caller,
 * so unstable_cache never has to serialize a Date. Invalidated by the
 * 'leaderboard' tag from upvote / submission / freeze actions, else 60s TTL.
 * Past weeks are not cached here — they read cheap frozen snapshots.
 */
const getCachedCurrentStandings = unstable_cache(
  async (): Promise<{ frozen: boolean; groups: Record<LeaderboardGroup, LeaderboardEntry[]> }> => {
    const result = await computeStandings(weekWindow(0));
    return { frozen: result.frozen, groups: result.groups };
  },
  ['leaderboard-current'],
  { revalidate: 60, tags: ['leaderboard'] },
);

/**
 * The board for a week: offset 0 = current (live), -1 = last week, etc.
 * Closed weeks read their frozen snapshot; if a closed week was never frozen we
 * fall back to a live recompute so history is never blank.
 */
export const getLeaderboard = cache(async (offset = 0): Promise<LeaderboardResult> => {
  const window = weekWindow(offset);
  if (offset === 0) {
    const { frozen, groups } = await getCachedCurrentStandings();
    return { window, frozen, groups };
  }
  return (await readSnapshot(window)) ?? computeStandings(window);
});

export type FreezeSummary = {
  weekStart: Date;
  totalRanked: number;
  winners: { group: LeaderboardGroup; name: string; username: string }[];
};

/** Ensure the Top-of-the-Week badge row exists; return its id. */
async function ensureTopBadge(db: Db): Promise<string> {
  await db
    .insert(badges)
    .values({
      slug: TOP_BADGE_SLUG,
      name: 'Top of the Week',
      description: 'رتبه‌ی اول مشارکت هفتگی در گروه — Top weekly contributor in their group.',
    })
    .onConflictDoNothing({ target: badges.slug });
  const [row] = await db.select({ id: badges.id }).from(badges).where(eq(badges.slug, TOP_BADGE_SLUG)).limit(1);
  return row.id;
}

/**
 * Freeze a closed week: write immutable snapshot rows and award the
 * Top-of-the-Week badge to each group's rank-1. Idempotent — re-running
 * replaces that week's snapshot and re-awards without duplicating (badge PK
 * guards repeats; a member keeps a single "has topped a week" badge).
 */
export async function freezeWeek(window: WeekWindow): Promise<FreezeSummary> {
  const db = getDb();
  const orgId = await getMainOrgId();
  if (!orgId) throw new Error('[leaderboard.freeze] main org not found');

  const standings = await computeStandings(window);
  const flat = GROUP_ORDER.flatMap((g) => standings.groups[g]);
  const winners = GROUP_ORDER.map((g) => standings.groups[g].find((e) => e.rank === 1))
    .filter((e): e is LeaderboardEntry => !!e)
    .map((e) => ({ group: e.group, name: e.name, username: e.username }));

  await db.transaction(async (tx) => {
    await tx
      .delete(leaderboardSnapshots)
      .where(and(eq(leaderboardSnapshots.orgId, orgId), eq(leaderboardSnapshots.weekStart, window.start)));
    if (flat.length > 0) {
      await tx.insert(leaderboardSnapshots).values(
        flat.map((e) => ({
          orgId,
          groupType: e.group,
          weekStart: window.start,
          weekEnd: window.end,
          userId: e.userId,
          rank: e.rank,
          score: e.score,
          breakdown: e.breakdown as unknown as Record<string, number>,
        })),
      );
      const badgeId = await ensureTopBadge(tx as unknown as Db);
      const rank1 = flat.filter((e) => e.rank === 1);
      if (rank1.length > 0) {
        await tx
          .insert(userBadges)
          .values(rank1.map((e) => ({ userId: e.userId, badgeId })))
          .onConflictDoNothing();
      }
    }
  });

  console.info(`[leaderboard.freeze] week ${window.start.toISOString()} — ${flat.length} ranked, ${winners.length} winners`);
  return { weekStart: window.start, totalRanked: flat.length, winners };
}
