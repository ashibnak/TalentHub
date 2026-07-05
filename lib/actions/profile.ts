'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { users, skills, userSkills } from '@/lib/db/schema';
import { requireUser } from '@/lib/auth/session';
import { isHttpUrl } from '@/lib/validation';

/** Revalidate the settings page + the user's public profile (username may be null). */
function revalidateProfile(username: string | null) {
  revalidatePath('/settings');
  if (username) revalidatePath(`/u/${username}`);
}

/** Edit your own core profile fields. */
export async function updateProfileAction(formData: FormData) {
  const user = await requireUser();

  const name = String(formData.get('name') ?? '').trim();
  const roleTitle = String(formData.get('roleTitle') ?? '').trim() || null;
  const bio = String(formData.get('bio') ?? '').trim() || null;
  const githubUsername = String(formData.get('githubUsername') ?? '').trim().replace(/^@/, '') || null;
  const linkedinUrl = String(formData.get('linkedinUrl') ?? '').trim() || null;

  if (name.length < 2 || name.length > 80) redirect('/settings?error=name');
  if (roleTitle && roleTitle.length > 120) redirect('/settings?error=roleTitle');
  if (bio && bio.length > 600) redirect('/settings?error=bio');
  if (githubUsername && !/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38})$/.test(githubUsername)) redirect('/settings?error=github');
  if (linkedinUrl && !isHttpUrl(linkedinUrl)) redirect('/settings?error=linkedin');

  await getDb().update(users).set({ name, roleTitle, bio, githubUsername, linkedinUrl }).where(eq(users.id, user.id));
  revalidateProfile(user.username);
  redirect('/settings?saved=profile');
}

/** Claim a skill (or update its claimed level). Verification stays untouched —
 *  self-service can only claim, not verify (that is the future AI feature). */
export async function addSkillAction(formData: FormData) {
  const user = await requireUser();
  const slug = String(formData.get('skillSlug') ?? '').trim();
  const level = Number(formData.get('claimedLevel') ?? '1');
  if (!slug) redirect('/settings?error=skill');
  if (!Number.isInteger(level) || level < 1 || level > 5) redirect('/settings?error=level');

  const db = getDb();
  const [skill] = await db.select({ id: skills.id }).from(skills).where(eq(skills.slug, slug)).limit(1);
  if (!skill) redirect('/settings?error=skill');

  await db
    .insert(userSkills)
    .values({ userId: user.id, skillId: skill.id, claimedLevel: level })
    .onConflictDoUpdate({ target: [userSkills.userId, userSkills.skillId], set: { claimedLevel: level } });
  revalidateProfile(user.username);
  redirect('/settings?saved=skill');
}

/** Remove a claimed skill. */
export async function removeSkillAction(formData: FormData) {
  const user = await requireUser();
  const slug = String(formData.get('skillSlug') ?? '').trim();
  if (!slug) redirect('/settings');

  const db = getDb();
  const [skill] = await db.select({ id: skills.id }).from(skills).where(eq(skills.slug, slug)).limit(1);
  if (skill) {
    await db.delete(userSkills).where(and(eq(userSkills.userId, user.id), eq(userSkills.skillId, skill.id)));
  }
  revalidateProfile(user.username);
  redirect('/settings?saved=skill_removed');
}
