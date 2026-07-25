'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { eq, inArray } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { users, domains, userDomainExpertise, skills, userSkills } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth/session';
import { parseOnboardingForm, DESTINATION_PATHS } from '@/lib/onboarding/rules';

export type OnboardingState = {
  error?: string;
};

/** Final wizard submit. Uses getCurrentUser directly (requireUser would funnel
 *  right back to /onboarding and loop). Idempotent: an already-onboarded user
 *  is bounced home untouched. */
export async function completeOnboardingAction(_prev: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.onboardingCompletedAt) redirect(user.isAdmin ? '/admin' : '/home');

  const parsed = parseOnboardingForm(formData);
  if ('error' in parsed) return { error: parsed.error };

  try {
    const db = getDb();

    // Resolve taxonomy slugs → ids (unknown slugs dropped; taxonomy is seed data).
    const domainSlugs = parsed.domains.map((d) => d.slug);
    const [domainRows, skillRows] = await Promise.all([
      domainSlugs.length
        ? db.select({ id: domains.id, slug: domains.slug }).from(domains).where(inArray(domains.slug, domainSlugs))
        : Promise.resolve([]),
      parsed.skillSlugs.length
        ? db.select({ id: skills.id }).from(skills).where(inArray(skills.slug, parsed.skillSlugs))
        : Promise.resolve([]),
    ]);
    const yearsBySlug = new Map(parsed.domains.map((d) => [d.slug, d.years]));

    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({
          onboardingChoice: parsed.choice,
          onboardingConfidence: parsed.confidence,
          onboardingCompletedAt: new Date(),
          roleTitle: parsed.roleTitle ?? undefined,
          bio: parsed.bio ?? undefined,
          githubUsername: parsed.githubUsername ?? undefined,
          lastActiveAt: new Date(),
        })
        .where(eq(users.id, user.id));

      if (domainRows.length) {
        await tx
          .insert(userDomainExpertise)
          .values(domainRows.map((d) => ({ userId: user.id, domainId: d.id, yearsExperience: yearsBySlug.get(d.slug) ?? null })))
          .onConflictDoNothing();
      }
      if (skillRows.length) {
        await tx
          .insert(userSkills)
          .values(skillRows.map((s) => ({ userId: user.id, skillId: s.id, claimedLevel: 3 })))
          .onConflictDoNothing();
      }
    });
  } catch (err) {
    console.error('[onboarding.complete]', err);
    return { error: 'internal' };
  }

  revalidatePath('/people');
  if (user.username) revalidatePath(`/u/${user.username}`);
  redirect(DESTINATION_PATHS[parsed.destination]);
}

/** «بعداً» on the welcome step: mark onboarding done without profile data —
 *  everything remains editable in /settings. */
export async function skipOnboardingAction() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!user.onboardingCompletedAt) {
    await getDb().update(users).set({ onboardingCompletedAt: new Date() }).where(eq(users.id, user.id));
  }
  redirect(user.isAdmin ? '/admin' : '/home');
}
