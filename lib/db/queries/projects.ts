import { cache } from 'react';
import { and, desc, eq, ilike, inArray, isNotNull, type SQL } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { escapeLike } from '@/lib/db/queries/filters';
import {
  users,
  skills,
  projects,
  projectSkills,
  projectAiTools,
  projectUpvotes,
  projectChallengeProblems,
  challengeProblems,
  challenges,
} from '@/lib/db/schema';
import type { ProjectStage } from '@/components/atoms/StageBadge';

export type DirectoryProject = {
  id: string;
  title: string;
  description: string;
  stage: ProjectStage;
  upvoteCount: number;
  ownerId: string;
  owner: { username: string | null; name: string };
  hasUpvoted: boolean;
  skills: { slug: string; name: string }[];
};

/** The subset of `projectIds` the viewer has upvoted, in one query (no N+1). Empty when signed out. */
async function fetchViewerUpvotes(viewerId: string | undefined, projectIds: string[]): Promise<Set<string>> {
  if (!viewerId || projectIds.length === 0) return new Set();
  const rows = await getDb()
    .select({ projectId: projectUpvotes.projectId })
    .from(projectUpvotes)
    .where(and(eq(projectUpvotes.userId, viewerId), inArray(projectUpvotes.projectId, projectIds)));
  return new Set(rows.map((r) => r.projectId));
}

export type ProjectFilters = { q?: string; skills?: string[]; tools?: string[]; sort?: 'newest' | 'upvotes' };

/** Projects directory (plan Week 5) — published projects with skill/tool filters,
 *  title search, and sort (most-upvoted default, or newest). */
export const getProjectsDirectory = cache(async (filters: ProjectFilters = {}, viewerId?: string): Promise<DirectoryProject[]> => {
  const db = getDb();

  const conditions = [eq(projects.status, 'published'), isNotNull(users.username)];
  const q = filters.q?.trim();
  if (q) conditions.push(ilike(projects.title, `%${escapeLike(q)}%`));
  if (filters.skills?.length) {
    conditions.push(
      inArray(
        projects.id,
        db.select({ id: projectSkills.projectId }).from(projectSkills).innerJoin(skills, eq(projectSkills.skillId, skills.id)).where(inArray(skills.slug, filters.skills)),
      ),
    );
  }
  if (filters.tools?.length) {
    conditions.push(
      inArray(projects.id, db.select({ id: projectAiTools.projectId }).from(projectAiTools).where(inArray(projectAiTools.toolSlug, filters.tools))),
    );
  }
  const orderBy: SQL[] = filters.sort === 'newest' ? [desc(projects.createdAt)] : [desc(projects.upvoteCount), desc(projects.createdAt)];

  const rows = await db
    .select({
      id: projects.id,
      title: projects.title,
      description: projects.description,
      stage: projects.stage,
      upvoteCount: projects.upvoteCount,
      ownerId: projects.userId,
      ownerUsername: users.username,
      ownerName: users.name,
    })
    .from(projects)
    .innerJoin(users, eq(projects.userId, users.id))
    .where(and(...conditions))
    .orderBy(...orderBy);
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const [skillRows, upvotedIds] = await Promise.all([
    db
      .select({ projectId: projectSkills.projectId, slug: skills.slug, name: skills.name })
      .from(projectSkills)
      .innerJoin(skills, eq(projectSkills.skillId, skills.id))
      .where(inArray(projectSkills.projectId, ids))
      .orderBy(skills.name),
    fetchViewerUpvotes(viewerId, ids),
  ]);

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    stage: r.stage,
    upvoteCount: r.upvoteCount,
    ownerId: r.ownerId,
    owner: { username: r.ownerUsername, name: r.ownerName },
    hasUpvoted: upvotedIds.has(r.id),
    skills: skillRows.filter((s) => s.projectId === r.id).map((s) => ({ slug: s.slug, name: s.name })),
  }));
});

export type ProjectDetail = {
  id: string;
  title: string;
  description: string;
  stage: ProjectStage;
  upvoteCount: number;
  githubUrl: string | null;
  demoUrl: string | null;
  coverImageUrl: string | null;
  owner: { username: string | null; name: string; roleTitle: string | null };
  hasUpvoted: boolean;
  skills: { slug: string; name: string }[];
  aiTools: string[];
  problems: { challengeSlug: string; challengeTitle: string; problemId: string; problemTitle: string }[];
};

/** Full project detail (plan Week 4). Null if not found or not published. */
export const getProjectById = cache(async (id: string, viewerId?: string): Promise<ProjectDetail | null> => {
  const db = getDb();

  const [row] = await db
    .select({
      id: projects.id,
      title: projects.title,
      description: projects.description,
      stage: projects.stage,
      status: projects.status,
      upvoteCount: projects.upvoteCount,
      githubUrl: projects.githubUrl,
      demoUrl: projects.demoUrl,
      coverImageUrl: projects.coverImageUrl,
      ownerUsername: users.username,
      ownerName: users.name,
      ownerRoleTitle: users.roleTitle,
    })
    .from(projects)
    .innerJoin(users, eq(projects.userId, users.id))
    .where(and(eq(projects.id, id), eq(projects.status, 'published'), isNotNull(users.username)))
    .limit(1);
  if (!row) return null;

  const [skillRows, toolRows, problemRows, upvotedIds] = await Promise.all([
    db
      .select({ slug: skills.slug, name: skills.name })
      .from(projectSkills)
      .innerJoin(skills, eq(projectSkills.skillId, skills.id))
      .where(eq(projectSkills.projectId, id))
      .orderBy(skills.name),
    db.select({ toolSlug: projectAiTools.toolSlug }).from(projectAiTools).where(eq(projectAiTools.projectId, id)),
    db
      .select({
        challengeSlug: challenges.slug,
        challengeTitle: challenges.title,
        problemId: challengeProblems.id,
        problemTitle: challengeProblems.title,
      })
      .from(projectChallengeProblems)
      .innerJoin(challengeProblems, eq(projectChallengeProblems.challengeProblemId, challengeProblems.id))
      .innerJoin(challenges, eq(challengeProblems.challengeId, challenges.id))
      .where(eq(projectChallengeProblems.projectId, id)),
    fetchViewerUpvotes(viewerId, [id]),
  ]);

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    stage: row.stage,
    upvoteCount: row.upvoteCount,
    githubUrl: row.githubUrl,
    demoUrl: row.demoUrl,
    coverImageUrl: row.coverImageUrl,
    owner: { username: row.ownerUsername, name: row.ownerName, roleTitle: row.ownerRoleTitle },
    hasUpvoted: upvotedIds.has(id),
    skills: skillRows,
    aiTools: toolRows.map((t) => t.toolSlug),
    problems: problemRows,
  };
});
