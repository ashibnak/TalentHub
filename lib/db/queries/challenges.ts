import { cache } from 'react';
import { and, count, countDistinct, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import {
  users,
  domains,
  userDomainExpertise,
  challenges,
  challengeProblems,
  projectChallengeProblems,
  projects,
} from '@/lib/db/schema';

export type DirectoryChallenge = {
  slug: string;
  title: string;
  description: string;
  sponsorTeam: string | null;
  problemCount: number;
  projectCount: number;
};

/**
 * Challenges directory (plan §3.5 / Week 8) — active buckets with live counts.
 * Counts come from grouped queries (not correlated subqueries) and only tally
 * ACTIVE problems and PUBLISHED projects, matching what's viewable elsewhere.
 */
export const getChallengesDirectory = cache(async (): Promise<DirectoryChallenge[]> => {
  const db = getDb();

  const [challengeRows, problemCounts, projectCounts] = await Promise.all([
    db
      .select({ id: challenges.id, slug: challenges.slug, title: challenges.title, description: challenges.description, sponsorTeam: challenges.sponsorTeam })
      .from(challenges)
      .where(eq(challenges.status, 'active')),
    db
      .select({ challengeId: challengeProblems.challengeId, n: count() })
      .from(challengeProblems)
      .where(eq(challengeProblems.status, 'active'))
      .groupBy(challengeProblems.challengeId),
    db
      .select({ challengeId: challengeProblems.challengeId, n: countDistinct(projectChallengeProblems.projectId) })
      .from(projectChallengeProblems)
      .innerJoin(challengeProblems, eq(projectChallengeProblems.challengeProblemId, challengeProblems.id))
      .innerJoin(projects, eq(projectChallengeProblems.projectId, projects.id))
      .where(and(eq(challengeProblems.status, 'active'), eq(projects.status, 'published')))
      .groupBy(challengeProblems.challengeId),
  ]);

  const problemCountByChallenge = new Map(problemCounts.map((r) => [r.challengeId, Number(r.n)]));
  const projectCountByChallenge = new Map(projectCounts.map((r) => [r.challengeId, Number(r.n)]));

  return challengeRows
    .map((c) => ({
      slug: c.slug,
      title: c.title,
      description: c.description,
      sponsorTeam: c.sponsorTeam,
      problemCount: problemCountByChallenge.get(c.id) ?? 0,
      projectCount: projectCountByChallenge.get(c.id) ?? 0,
    }))
    .sort((a, b) => b.projectCount - a.projectCount || a.title.localeCompare(b.title, 'fa'));
});

export type ChallengeDetail = {
  slug: string;
  title: string;
  description: string;
  sponsorTeam: string | null;
  problems: { id: string; title: string; description: string; projectCount: number; isSpotlight: boolean }[];
  domainExperts: { username: string; name: string; roleTitle: string | null; yearsExperience: number | null }[];
};

/** Challenge detail with its problems and the "Domain experts in this area" grid. */
export const getChallengeBySlug = cache(async (slug: string): Promise<ChallengeDetail | null> => {
  const db = getDb();

  const [challenge] = await db
    .select({
      id: challenges.id,
      slug: challenges.slug,
      title: challenges.title,
      description: challenges.description,
      sponsorTeam: challenges.sponsorTeam,
    })
    .from(challenges)
    .where(and(eq(challenges.slug, slug), eq(challenges.status, 'active')))
    .limit(1);
  if (!challenge) return null;

  const [problemRows, expertRows] = await Promise.all([
    db
      .select({
        id: challengeProblems.id,
        title: challengeProblems.title,
        description: challengeProblems.description,
        isSpotlight: challengeProblems.isSpotlight,
      })
      .from(challengeProblems)
      .where(and(eq(challengeProblems.challengeId, challenge.id), eq(challengeProblems.status, 'active')))
      .orderBy(sql`${challengeProblems.isSpotlight} desc`, challengeProblems.title),
    // Domain experts (plan §3.5 / Week 8 Prompt 5): domain slug = challenge slug,
    // most experienced first (nulls last), then most recently active. Real handles only.
    db
      .select({
        username: users.username,
        name: users.name,
        roleTitle: users.roleTitle,
        yearsExperience: userDomainExpertise.yearsExperience,
      })
      .from(userDomainExpertise)
      .innerJoin(domains, eq(userDomainExpertise.domainId, domains.id))
      .innerJoin(users, eq(userDomainExpertise.userId, users.id))
      .where(
        and(eq(domains.slug, slug), eq(users.status, 'active'), eq(users.isAdmin, false), isNotNull(users.username)),
      )
      .orderBy(sql`${userDomainExpertise.yearsExperience} desc nulls last, ${users.lastActiveAt} desc nulls last`)
      .limit(8),
  ]);

  // Per-problem published-project counts via one grouped query.
  const problemIds = problemRows.map((p) => p.id);
  const projectCounts = problemIds.length
    ? await db
        .select({ problemId: projectChallengeProblems.challengeProblemId, n: countDistinct(projectChallengeProblems.projectId) })
        .from(projectChallengeProblems)
        .innerJoin(projects, eq(projectChallengeProblems.projectId, projects.id))
        .where(and(inArray(projectChallengeProblems.challengeProblemId, problemIds), eq(projects.status, 'published')))
        .groupBy(projectChallengeProblems.challengeProblemId)
    : [];
  const projectCountByProblem = new Map(projectCounts.map((r) => [r.problemId, Number(r.n)]));

  return {
    slug: challenge.slug,
    title: challenge.title,
    description: challenge.description,
    sponsorTeam: challenge.sponsorTeam,
    problems: problemRows.map((p) => ({ ...p, projectCount: projectCountByProblem.get(p.id) ?? 0 })),
    domainExperts: expertRows.map((e) => ({ ...e, username: e.username! })),
  };
});
