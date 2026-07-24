import { cache } from 'react';
import { and, desc, eq, isNotNull, notInArray } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { orgs, users, projects, challenges, challengeProblems, projectChallengeProblems } from '@/lib/db/schema';
import type { ProjectStage } from '@/components/atoms/StageBadge';
import type { IpTerms } from '@/lib/submissions/rules';

const MAIN_ORG_SLUG = 'main-org'; // phase-1 single org (CODE_CONVENTIONS §4)

// challenge_problems / projects carry no org_id of their own — the org lives on
// the parent `challenges` row, so we scope through that join. (Projects are
// additionally scoped by the signed-in user's id, who belongs to the org.)
const getMainOrgId = cache(async (): Promise<string | null> => {
  const [org] = await getDb().select({ id: orgs.id }).from(orgs).where(eq(orgs.slug, MAIN_ORG_SLUG)).limit(1);
  return org?.id ?? null;
});

export type ProblemForSubmission = {
  id: string;
  title: string;
  description: string;
  status: 'pending_review' | 'active' | 'resolved' | 'archived' | 'rejected';
  ipTerms: IpTerms;
  ipTermsNote: string | null;
  isSpotlight: boolean;
  challengeSlug: string;
  challengeTitle: string;
};

/** One challenge problem (org-scoped via its challenge) for the problem detail page. */
export const getProblemForSubmission = cache(async (problemId: string): Promise<ProblemForSubmission | null> => {
  const orgId = await getMainOrgId();
  if (!orgId) return null;

  const [row] = await getDb()
    .select({
      id: challengeProblems.id,
      title: challengeProblems.title,
      description: challengeProblems.description,
      status: challengeProblems.status,
      ipTerms: challengeProblems.ipTerms,
      ipTermsNote: challengeProblems.ipTermsNote,
      isSpotlight: challengeProblems.isSpotlight,
      challengeSlug: challenges.slug,
      challengeTitle: challenges.title,
    })
    .from(challengeProblems)
    .innerJoin(challenges, eq(challengeProblems.challengeId, challenges.id))
    .where(and(eq(challengeProblems.id, problemId), eq(challenges.orgId, orgId)))
    .limit(1);
  return row ?? null;
});

export type ProblemSubmission = {
  projectId: string;
  projectTitle: string;
  ownerName: string;
  ownerUsername: string;
  solutionDescription: string;
  upvoteCount: number;
};

/**
 * Published projects submitted to a problem, with owner + write-up, most-upvoted
 * first. Only published projects with a real profile handle are surfaced.
 */
export const getProblemSubmissions = cache(async (problemId: string): Promise<ProblemSubmission[]> => {
  const rows = await getDb()
    .select({
      projectId: projects.id,
      projectTitle: projects.title,
      ownerName: users.name,
      ownerUsername: users.username,
      solutionDescription: projectChallengeProblems.solutionDescription,
      upvoteCount: projects.upvoteCount,
      createdAt: projectChallengeProblems.createdAt,
    })
    .from(projectChallengeProblems)
    .innerJoin(projects, eq(projectChallengeProblems.projectId, projects.id))
    .innerJoin(users, eq(projects.userId, users.id))
    .where(
      and(
        eq(projectChallengeProblems.challengeProblemId, problemId),
        eq(projects.status, 'published'),
        isNotNull(users.username),
      ),
    )
    .orderBy(desc(projects.upvoteCount), desc(projectChallengeProblems.createdAt));

  return rows.map((r) => ({
    projectId: r.projectId,
    projectTitle: r.projectTitle,
    ownerName: r.ownerName,
    ownerUsername: r.ownerUsername!,
    solutionDescription: r.solutionDescription,
    upvoteCount: r.upvoteCount,
  }));
});

export type SubmittableProject = { id: string; title: string; stage: ProjectStage };

/** The user's published projects not already linked to this problem (for the submit picker). */
export const getMySubmittableProjects = cache(
  async (userId: string, problemId: string): Promise<SubmittableProject[]> => {
    const db = getDb();
    const alreadyLinked = db
      .select({ id: projectChallengeProblems.projectId })
      .from(projectChallengeProblems)
      .where(eq(projectChallengeProblems.challengeProblemId, problemId));

    return db
      .select({ id: projects.id, title: projects.title, stage: projects.stage })
      .from(projects)
      .where(and(eq(projects.userId, userId), eq(projects.status, 'published'), notInArray(projects.id, alreadyLinked)))
      .orderBy(desc(projects.createdAt));
  },
);
