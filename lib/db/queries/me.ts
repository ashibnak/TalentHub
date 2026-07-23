import { cache } from 'react';
import { and, desc, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { projects, projectSkills, projectAiTools, skills, userSkills, users } from '@/lib/db/schema';
import type { ProjectStage } from '@/components/atoms/StageBadge';
import type { SkillCategory } from '@/lib/db/queries/taxonomy';

// ── The signed-in user's own data (keyed by user id, never by the public
//    username) for the /settings and project-editor surfaces. ──

export type MyProfileFields = {
  name: string;
  roleTitle: string | null;
  bio: string | null;
  githubUsername: string | null;
  linkedinUrl: string | null;
  username: string | null;
};

export const getMyProfile = cache(async (userId: string): Promise<MyProfileFields | null> => {
  const [row] = await getDb()
    .select({
      name: users.name,
      roleTitle: users.roleTitle,
      bio: users.bio,
      githubUsername: users.githubUsername,
      linkedinUrl: users.linkedinUrl,
      username: users.username,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row ?? null;
});

export type MyUserSkill = {
  slug: string;
  name: string;
  category: SkillCategory;
  claimedLevel: number;
  verified: boolean;
};

export const getMyUserSkills = cache(async (userId: string): Promise<MyUserSkill[]> => {
  return getDb()
    .select({
      slug: skills.slug,
      name: skills.name,
      category: skills.category,
      claimedLevel: userSkills.claimedLevel,
      verified: userSkills.verified,
    })
    .from(userSkills)
    .innerJoin(skills, eq(userSkills.skillId, skills.id))
    .where(eq(userSkills.userId, userId))
    .orderBy(desc(userSkills.verified), desc(userSkills.claimedLevel), skills.name);
});

export type MyProject = {
  id: string;
  title: string;
  stage: ProjectStage;
  status: 'draft' | 'published';
  upvoteCount: number;
};

/** All of the user's projects, drafts included (unlike the public directory). */
export const getMyProjects = cache(async (userId: string): Promise<MyProject[]> => {
  return getDb()
    .select({
      id: projects.id,
      title: projects.title,
      stage: projects.stage,
      status: projects.status,
      upvoteCount: projects.upvoteCount,
    })
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(desc(projects.createdAt));
});

export type EditableProject = {
  id: string;
  title: string;
  description: string;
  stage: ProjectStage;
  status: 'draft' | 'published';
  githubUrl: string | null;
  demoUrl: string | null;
  skillSlugs: string[];
  toolSlugs: string[];
};

/** One project for its OWNER to edit — no status filter (drafts included), and
 *  scoped to `userId` so it returns null (→ 404) for anyone else's project. */
export const getMyProjectForEdit = cache(
  async (id: string, userId: string): Promise<EditableProject | null> => {
    const db = getDb();
    const [row] = await db
      .select({
        id: projects.id,
        title: projects.title,
        description: projects.description,
        stage: projects.stage,
        status: projects.status,
        githubUrl: projects.githubUrl,
        demoUrl: projects.demoUrl,
      })
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.userId, userId)))
      .limit(1);
    if (!row) return null;

    const [skillRows, toolRows] = await Promise.all([
      db
        .select({ slug: skills.slug })
        .from(projectSkills)
        .innerJoin(skills, eq(projectSkills.skillId, skills.id))
        .where(eq(projectSkills.projectId, id)),
      db.select({ toolSlug: projectAiTools.toolSlug }).from(projectAiTools).where(eq(projectAiTools.projectId, id)),
    ]);

    return {
      ...row,
      skillSlugs: skillRows.map((s) => s.slug),
      toolSlugs: toolRows.map((t) => t.toolSlug),
    };
  },
);
