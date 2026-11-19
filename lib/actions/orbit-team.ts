'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { ideaMembers, ideaMentors, ideas, lessons, orbitCourseOpens, projects, users } from '@/lib/db/schema';
import { requireUser } from '@/lib/auth/session';
import { orbitCourse } from '@/lib/ideas/courses';
import { mentorRole } from '@/lib/ideas/mentors';

function back(ideaId: string, code: string): never {
  redirect(`/ideas/${ideaId}?teamError=${code}`);
}

async function ownedIdea(ideaId: string, userId: string, orgId: string) {
  const [idea] = await getDb()
    .select({ id: ideas.id, userId: ideas.userId })
    .from(ideas)
    .where(and(eq(ideas.id, ideaId), eq(ideas.userId, userId), eq(ideas.orgId, orgId)))
    .limit(1);
  return idea ?? null;
}

/** Owner adds someone from the same org by username. The author is not a member row. */
export async function addIdeaMemberAction(formData: FormData) {
  const user = await requireUser();
  const ideaId = String(formData.get('ideaId') ?? '');
  const username = String(formData.get('username') ?? '').trim().toLowerCase();
  if (!ideaId) redirect('/ideas/mine');
  if (!username) back(ideaId, 'username');

  const idea = await ownedIdea(ideaId, user.id, user.orgId);
  if (!idea) back(ideaId, 'not_owner');

  const [member] = await getDb()
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.orgId, user.orgId), eq(users.username, username), eq(users.status, 'active')))
    .limit(1);
  if (!member) back(ideaId, 'not_found');
  if (member.id === user.id) back(ideaId, 'self');

  await getDb().insert(ideaMembers).values({ ideaId, userId: member.id }).onConflictDoNothing();
  revalidatePath(`/ideas/${ideaId}`);
  redirect(`/ideas/${ideaId}?team=1`);
}

export async function removeIdeaMemberAction(formData: FormData) {
  const user = await requireUser();
  const ideaId = String(formData.get('ideaId') ?? '');
  const memberId = String(formData.get('memberId') ?? '');
  if (!ideaId || !memberId) redirect('/ideas/mine');
  const idea = await ownedIdea(ideaId, user.id, user.orgId);
  if (!idea) back(ideaId, 'not_owner');

  await getDb()
    .delete(ideaMembers)
    .where(and(eq(ideaMembers.ideaId, ideaId), eq(ideaMembers.userId, memberId)));
  revalidatePath(`/ideas/${ideaId}`);
  redirect(`/ideas/${ideaId}?team=1`);
}

async function canManageIdea(ideaId: string, user: { id: string; orgId: string; isAdmin: boolean }) {
  const [idea] = await getDb()
    .select({ id: ideas.id, userId: ideas.userId })
    .from(ideas)
    .where(and(eq(ideas.id, ideaId), eq(ideas.orgId, user.orgId)))
    .limit(1);
  if (!idea) return null;
  if (idea.userId === user.id || user.isAdmin) return idea;
  return null;
}

/** Owner or an admin assigns one of the six mentor roles. */
export async function assignIdeaMentorAction(formData: FormData) {
  const user = await requireUser();
  const ideaId = String(formData.get('ideaId') ?? '');
  const username = String(formData.get('username') ?? '').trim().toLowerCase();
  const role = mentorRole(String(formData.get('role') ?? ''));
  if (!ideaId) redirect('/ideas/mine');
  if (!username || !role) back(ideaId, 'mentor');

  const idea = await canManageIdea(ideaId, user);
  if (!idea) back(ideaId, 'not_owner');

  const [mentor] = await getDb()
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.orgId, user.orgId), eq(users.username, username), eq(users.status, 'active')))
    .limit(1);
  if (!mentor) back(ideaId, 'not_found');

  await getDb().insert(ideaMentors).values({ ideaId, userId: mentor.id, role }).onConflictDoNothing();
  revalidatePath(`/ideas/${ideaId}`);
  redirect(`/ideas/${ideaId}?mentor=1`);
}

export async function removeIdeaMentorAction(formData: FormData) {
  const user = await requireUser();
  const ideaId = String(formData.get('ideaId') ?? '');
  const mentorId = String(formData.get('mentorId') ?? '');
  const role = mentorRole(String(formData.get('role') ?? ''));
  if (!ideaId || !mentorId || !role) redirect('/ideas/mine');
  const idea = await canManageIdea(ideaId, user);
  if (!idea) back(ideaId, 'not_owner');

  await getDb()
    .delete(ideaMentors)
    .where(and(eq(ideaMentors.ideaId, ideaId), eq(ideaMentors.userId, mentorId), eq(ideaMentors.role, role)));
  revalidatePath(`/ideas/${ideaId}`);
  redirect(`/ideas/${ideaId}?mentor=1`);
}

/** Owner or a member links a published project they own as the demo. */
export async function linkDemoProjectAction(formData: FormData) {
  const user = await requireUser();
  const ideaId = String(formData.get('ideaId') ?? '');
  const projectId = String(formData.get('projectId') ?? '');
  if (!ideaId) redirect('/ideas/mine');

  const [idea] = await getDb()
    .select({ id: ideas.id, userId: ideas.userId, orgId: ideas.orgId })
    .from(ideas)
    .where(and(eq(ideas.id, ideaId), eq(ideas.orgId, user.orgId)))
    .limit(1);
  if (!idea) back(ideaId, 'not_found');

  const memberRows = await getDb()
    .select({ userId: ideaMembers.userId })
    .from(ideaMembers)
    .where(eq(ideaMembers.ideaId, ideaId));
  const allowed = new Set([idea.userId, ...memberRows.map((row) => row.userId)]);
  if (!allowed.has(user.id) && !user.isAdmin) back(ideaId, 'not_owner');

  if (!projectId) {
    await getDb().update(ideas).set({ demoProjectId: null, updatedAt: new Date() }).where(eq(ideas.id, ideaId));
  } else {
    const [project] = await getDb()
      .select({ id: projects.id, userId: projects.userId })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.orgId, user.orgId), eq(projects.status, 'published')))
      .limit(1);
    if (!project || !allowed.has(project.userId)) back(ideaId, 'project');
    await getDb().update(ideas).set({ demoProjectId: project.id, updatedAt: new Date() }).where(eq(ideas.id, ideaId));
  }

  revalidatePath(`/ideas/${ideaId}`);
  redirect(`/ideas/${ideaId}?demo=1`);
}

/** Record that this member opened an Orbit course, then send them to the lesson. */
export async function openOrbitCourseAction(formData: FormData) {
  const user = await requireUser();
  const ideaId = String(formData.get('ideaId') ?? '');
  const course = orbitCourse(String(formData.get('courseKey') ?? ''));
  if (!ideaId || !course) redirect(ideaId ? `/ideas/${ideaId}?courseError=1` : '/ideas');

  await getDb()
    .insert(orbitCourseOpens)
    .values({ userId: user.id, courseKey: course.key })
    .onConflictDoNothing();

  const [lesson] = await getDb()
    .select({ url: lessons.url })
    .from(lessons)
    .where(eq(lessons.slug, course.lessonSlug))
    .limit(1);

  revalidatePath(`/ideas/${ideaId}`);
  if (!lesson?.url) redirect(`/ideas/${ideaId}?courseError=1`);
  redirect(lesson.url);
}
