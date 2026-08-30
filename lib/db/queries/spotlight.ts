import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { and, asc, count, desc, eq, gt, inArray, isNotNull, isNull, lte, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import {
  challenges,
  challengeProblems,
  projectChallengeProblems,
  projects,
  users,
} from '@/lib/db/schema';
import { getMainOrgId } from '@/lib/db/queries/org';
import { daysRemaining, type SpotlightProblem } from '@/lib/spotlight/rules';

export type CurrentSpotlight = {
  problemId: string;
  title: string;
  description: string;
  challengeSlug: string;
  challengeTitle: string;
  submissionCount: number;
  endsAt: Date;
  daysRemaining: number;
};

/** JSON-safe shape actually stored in the cross-request cache (no Date objects). */
type CachedSpotlight = Omit<CurrentSpotlight, 'endsAt' | 'daysRemaining'> & { endsAtIso: string };

/**
 * Cross-request cache of the one live spotlight. This renders on /home for
 * every signed-in user, so it must not cost two queries per page view.
 *
 * Only JSON-safe fields are cached — `endsAt` is stored as an ISO string and
 * `daysRemaining` is deliberately NOT cached, because a cached "۴ روز" would
 * still say four days tomorrow. Same reasoning as the leaderboard's
 * getCachedCurrentStandings, which keeps its week Dates outside the cache.
 *
 * Invalidated by the 'spotlight' tag from the three admin actions; 60s TTL
 * otherwise.
 */
const getCachedSpotlight = unstable_cache(
  async (): Promise<CachedSpotlight | null> => {
    const orgId = await getMainOrgId();
    if (!orgId) return null;

    const [row] = await getDb()
      .select({
        problemId: challengeProblems.id,
        title: challengeProblems.title,
        description: challengeProblems.description,
        challengeSlug: challenges.slug,
        challengeTitle: challenges.title,
        endsAt: challengeProblems.spotlightEndsAt,
        submissionCount: sql<number>`(
          select count(*)::int from ${projectChallengeProblems}
          where ${projectChallengeProblems.challengeProblemId} = ${challengeProblems.id}
        )`,
      })
      .from(challengeProblems)
      .innerJoin(challenges, eq(challengeProblems.challengeId, challenges.id))
      .where(
        and(
          eq(challenges.orgId, orgId),
          eq(challengeProblems.isSpotlight, true),
          isNotNull(challengeProblems.spotlightEndsAt),
          // A CLOSED window is not a live spotlight. Without this, a flag left
          // true after the week ended (the demo seed does exactly that) renders
          // an expired banner reading «امروز آخرین روز» forever. The banner
          // follows the clock, not just the flag; `is_spotlight` alone decides
          // only whether the slot is taken (canSpotlight), not what's shown.
          // Recomputed on each cache miss, so at most ~60s past the boundary.
          gt(challengeProblems.spotlightEndsAt, new Date()),
        ),
      )
      // canSpotlight() guarantees at most one, but order deterministically so a
      // manual DB edit can never make the banner flicker between two rows.
      .orderBy(desc(challengeProblems.spotlightStartsAt))
      .limit(1);

    if (!row?.endsAt) return null;
    return {
      problemId: row.problemId,
      title: row.title,
      description: row.description,
      challengeSlug: row.challengeSlug,
      challengeTitle: row.challengeTitle,
      submissionCount: Number(row.submissionCount),
      endsAtIso: row.endsAt.toISOString(),
    };
  },
  ['spotlight-current'],
  { revalidate: 60, tags: ['spotlight'] },
);

/** The live spotlight for the home banner, or null when none is running. */
export const getCurrentSpotlight = cache(async (): Promise<CurrentSpotlight | null> => {
  const cached = await getCachedSpotlight();
  if (!cached) return null;

  const { endsAtIso, ...rest } = cached;
  const endsAt = new Date(endsAtIso);
  // Computed per request, not per cache entry — see the note above.
  return { ...rest, endsAt, daysRemaining: daysRemaining({ spotlightEndsAt: endsAt }) };
});

/** Owner + status view of one problem, for the lifecycle guards in the actions. */
export async function getSpotlightProblem(problemId: string): Promise<SpotlightProblem | null> {
  const orgId = await getMainOrgId();
  if (!orgId) return null;

  const [row] = await getDb()
    .select({
      id: challengeProblems.id,
      status: challengeProblems.status,
      isSpotlight: challengeProblems.isSpotlight,
      spotlightEndsAt: challengeProblems.spotlightEndsAt,
      spotlightWinnerProjectId: challengeProblems.spotlightWinnerProjectId,
    })
    .from(challengeProblems)
    .innerJoin(challenges, eq(challengeProblems.challengeId, challenges.id))
    .where(and(eq(challengeProblems.id, problemId), eq(challenges.orgId, orgId)))
    .limit(1);
  return row ?? null;
}

/** Whatever is spotlighted right now (id only) — the `canSpotlight` second argument. */
export async function getActiveSpotlightRef(): Promise<{ id: string } | null> {
  const orgId = await getMainOrgId();
  if (!orgId) return null;

  const [row] = await getDb()
    .select({ id: challengeProblems.id })
    .from(challengeProblems)
    .innerJoin(challenges, eq(challengeProblems.challengeId, challenges.id))
    .where(and(eq(challenges.orgId, orgId), eq(challengeProblems.isSpotlight, true)))
    .limit(1);
  return row ?? null;
}

export type SpotlightCandidate = { projectId: string; title: string; ownerName: string; upvoteCount: number };

export type ExpiredSpotlight = {
  problemId: string;
  title: string;
  challengeSlug: string;
  challengeTitle: string;
  endsAt: Date;
  /** Projects linked to this problem — the ONLY valid winners (canPickWinner). */
  candidates: SpotlightCandidate[];
};

/**
 * Closed spotlight windows still waiting on a winner — the admin prompt.
 *
 * Not cached: it drives a write form on /admin, where a stale list is worse
 * than a second query. `is_spotlight` is not in the predicate on purpose, so a
 * window ended early with endSpotlightAction still shows up here for its winner.
 */
export const getExpiredSpotlightsAwaitingWinner = cache(async (): Promise<ExpiredSpotlight[]> => {
  const orgId = await getMainOrgId();
  if (!orgId) return [];
  const db = getDb();

  const rows = await db
    .select({
      problemId: challengeProblems.id,
      title: challengeProblems.title,
      challengeSlug: challenges.slug,
      challengeTitle: challenges.title,
      endsAt: challengeProblems.spotlightEndsAt,
    })
    .from(challengeProblems)
    .innerJoin(challenges, eq(challengeProblems.challengeId, challenges.id))
    .where(
      and(
        eq(challenges.orgId, orgId),
        isNotNull(challengeProblems.spotlightEndsAt),
        lte(challengeProblems.spotlightEndsAt, new Date()),
        isNull(challengeProblems.spotlightWinnerProjectId),
      ),
    )
    .orderBy(asc(challengeProblems.spotlightEndsAt));

  if (rows.length === 0) return [];

  // One query for every candidate across all pending problems — no N+1, and
  // scoped to those problems so this never scans the whole submission table.
  const problemIds = rows.map((r) => r.problemId);
  const candidateRows = await db
    .select({
      problemId: projectChallengeProblems.challengeProblemId,
      projectId: projects.id,
      title: projects.title,
      ownerName: users.name,
      upvoteCount: projects.upvoteCount,
    })
    .from(projectChallengeProblems)
    .innerJoin(projects, eq(projectChallengeProblems.projectId, projects.id))
    .innerJoin(users, eq(projects.userId, users.id))
    .where(
      and(
        inArray(projectChallengeProblems.challengeProblemId, problemIds),
        eq(projects.status, 'published'),
      ),
    )
    .orderBy(desc(projects.upvoteCount));

  const byProblem = new Map<string, SpotlightCandidate[]>();
  for (const c of candidateRows) {
    if (!byProblem.has(c.problemId)) byProblem.set(c.problemId, []);
    byProblem.get(c.problemId)!.push({
      projectId: c.projectId,
      title: c.title,
      ownerName: c.ownerName,
      upvoteCount: c.upvoteCount,
    });
  }

  return rows
    .filter((r): r is typeof r & { endsAt: Date } => !!r.endsAt)
    .map((r) => ({
      problemId: r.problemId,
      title: r.title,
      challengeSlug: r.challengeSlug,
      challengeTitle: r.challengeTitle,
      endsAt: r.endsAt,
      candidates: byProblem.get(r.problemId) ?? [],
    }));
});

/** Project ids linked to a problem — the allowlist `canPickWinner` checks against. */
export async function getLinkedProjectIds(problemId: string): Promise<string[]> {
  const rows = await getDb()
    .select({ projectId: projectChallengeProblems.projectId })
    .from(projectChallengeProblems)
    .where(eq(projectChallengeProblems.challengeProblemId, problemId));
  return rows.map((r) => r.projectId);
}

/** Count of problems currently spotlighted — used only by the admin card copy. */
export async function countActiveSpotlights(): Promise<number> {
  const orgId = await getMainOrgId();
  if (!orgId) return 0;
  const [row] = await getDb()
    .select({ n: count() })
    .from(challengeProblems)
    .innerJoin(challenges, eq(challengeProblems.challengeId, challenges.id))
    .where(and(eq(challenges.orgId, orgId), eq(challengeProblems.isSpotlight, true)));
  return Number(row?.n ?? 0);
}
