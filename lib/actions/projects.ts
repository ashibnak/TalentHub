'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { and, eq, inArray } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { projects, projectSkills, projectAiTools, skills } from '@/lib/db/schema';
import { requireUser } from '@/lib/auth/session';
import { parseProjectForm } from '@/lib/projects/rules';

type Db = ReturnType<typeof getDb>;

/** Resolve submitted skill SLUGS → ids (validates existence; unknown slugs dropped). */
async function resolveSkillIds(db: Db, slugs: string[]): Promise<string[]> {
  if (slugs.length === 0) return [];
  const rows = await db.select({ id: skills.id }).from(skills).where(inArray(skills.slug, slugs));
  return rows.map((r) => r.id);
}

/** Talent creates a project. */
export async function createProjectAction(formData: FormData) {
  const user = await requireUser();

  const parsed = parseProjectForm(formData);
  if ('error' in parsed) redirect(`/projects/new?error=${parsed.error}`);

  const db = getDb();
  const skillIds = await resolveSkillIds(db, parsed.skillSlugs);

  const newId = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(projects)
      .values({
        userId: user.id,
        orgId: user.orgId,
        title: parsed.title,
        description: parsed.description,
        stage: parsed.stage,
        githubUrl: parsed.githubUrl,
        demoUrl: parsed.demoUrl,
        status: parsed.publish ? 'published' : 'draft',
        isPersonalProjectConfirmed: true,
      })
      .returning({ id: projects.id });
    if (skillIds.length) await tx.insert(projectSkills).values(skillIds.map((skillId) => ({ projectId: row.id, skillId })));
    if (parsed.toolSlugs.length)
      await tx.insert(projectAiTools).values(parsed.toolSlugs.map((toolSlug) => ({ projectId: row.id, toolSlug })));
    return row.id;
  });

  revalidatePath('/projects');
  revalidatePath('/settings');
  redirect(parsed.publish ? `/projects/${newId}` : '/settings?saved=project');
}

/** Owner edits a project. Skills/tools are re-synced (delete + reinsert) in a tx. */
export async function updateProjectAction(formData: FormData) {
  const user = await requireUser();
  const projectId = String(formData.get('projectId') ?? '');
  if (!projectId) redirect('/settings');

  const db = getDb();
  const [owned] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)))
    .limit(1);
  if (!owned) redirect('/settings?error=forbidden');

  const parsed = parseProjectForm(formData);
  if ('error' in parsed) redirect(`/projects/${projectId}/edit?error=${parsed.error}`);

  const skillIds = await resolveSkillIds(db, parsed.skillSlugs);

  await db.transaction(async (tx) => {
    await tx
      .update(projects)
      .set({
        title: parsed.title,
        description: parsed.description,
        stage: parsed.stage,
        githubUrl: parsed.githubUrl,
        demoUrl: parsed.demoUrl,
        status: parsed.publish ? 'published' : 'draft',
        isPersonalProjectConfirmed: true,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId));
    await tx.delete(projectSkills).where(eq(projectSkills.projectId, projectId));
    if (skillIds.length) await tx.insert(projectSkills).values(skillIds.map((skillId) => ({ projectId, skillId })));
    await tx.delete(projectAiTools).where(eq(projectAiTools.projectId, projectId));
    if (parsed.toolSlugs.length)
      await tx.insert(projectAiTools).values(parsed.toolSlugs.map((toolSlug) => ({ projectId, toolSlug })));
  });

  revalidatePath('/projects');
  revalidatePath(`/projects/${projectId}`);
  revalidatePath('/settings');
  redirect(parsed.publish ? `/projects/${projectId}` : '/settings?saved=project');
}

/** Owner deletes a project (join rows cascade; applications.projectId → null). */
export async function deleteProjectAction(formData: FormData) {
  const user = await requireUser();
  const projectId = String(formData.get('projectId') ?? '');
  if (!projectId) redirect('/settings');

  await getDb().delete(projects).where(and(eq(projects.id, projectId), eq(projects.userId, user.id)));
  revalidatePath('/projects');
  revalidatePath('/settings');
  redirect('/settings?saved=project_deleted');
}

/** Owner publishes / unpublishes a project from the list. */
export async function setProjectStatusAction(formData: FormData) {
  const user = await requireUser();
  const projectId = String(formData.get('projectId') ?? '');
  const status = String(formData.get('status') ?? '');
  if (!projectId || (status !== 'draft' && status !== 'published')) redirect('/settings');

  await getDb()
    .update(projects)
    .set({ status: status as 'draft' | 'published', updatedAt: new Date() })
    .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)));
  revalidatePath('/projects');
  revalidatePath(`/projects/${projectId}`);
  revalidatePath('/settings');
  redirect('/settings?saved=project');
}
