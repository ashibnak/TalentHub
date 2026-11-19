'use server';

import { redirect } from 'next/navigation';
import { revalidatePath, revalidateTag } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { badges, challengeProblems, projects, userBadges } from '@/lib/db/schema';
import { requireAdmin } from '@/lib/auth/session';
import {
  getActiveSpotlightRef,
  getLinkedProjectIds,
  getSpotlightProblem,
} from '@/lib/db/queries/spotlight';
import {
  EndSpotlightSchema,
  PickWinnerSchema,
  StartSpotlightSchema,
  canPickWinner,
  canSpotlight,
  spotlightWindow,
} from '@/lib/spotlight/rules';

/**
 * The weekly Spotlight cycle, driven by an admin — no cron.
 *
 * Railway runs a single web process, and this repo already chose admin-
 * triggered rituals over a scheduler (freezeLastWeekAction closes the
 * leaderboard week). Spotlight is the same shape: an admin opens a window on
 * Saturday, and closes it with a winner the following Saturday. Both controls
 * sit together on /admin.
 *
 * ⚠️ INVARIANT — `spotlight_ends_at` is NEVER nulled once set.
 * lib/db/queries/leaderboard.ts credits a spotlight win inside the week window
 * of `spotlight_ends_at`. Clearing it would silently delete the winner's 50
 * points, the single largest weight on the board, with no error anywhere.
 * Closing a spotlight flips `is_spotlight` and nothing else.
 */

const SPOTLIGHT_BADGE_SLUG = 'spotlight-solver';

/** Re-throw Next's internal redirect signal instead of swallowing it as an error. */
function rethrowRedirect(err: unknown): void {
  if (err && typeof err === 'object' && 'digest' in err && String((err as { digest: unknown }).digest).startsWith('NEXT_REDIRECT'))
    throw err;
}

/** Invalidate every surface that reads spotlight state. */
function revalidateSpotlight(challengeSlug?: string, problemId?: string): void {
  revalidateTag('spotlight');
  revalidateTag('leaderboard'); // a decided win feeds the weekly score
  revalidatePath('/home');
  revalidatePath('/admin');
  revalidatePath('/challenges');
  if (challengeSlug && problemId) revalidatePath(`/challenges/${challengeSlug}/${problemId}`);
}

/**
 * Open a seven-day Spotlight window on an active problem. Spotlight never
 * creates a problem — it raises one that already exists (PROJECT_PLAN §3.5).
 */
export async function startSpotlightAction(formData: FormData) {
  await requireAdmin();

  const parsed = StartSpotlightSchema.safeParse({ problemId: String(formData.get('problemId') ?? '') });
  if (!parsed.success) redirect('/admin?spotlightError=invalid');

  const { problemId } = parsed.data;
  const back = String(formData.get('returnTo') ?? '/admin');

  try {
    const [problem, current] = await Promise.all([getSpotlightProblem(problemId), getActiveSpotlightRef()]);

    const rejection = canSpotlight(problem, current);
    if (rejection) {
      console.warn(`[spotlight.start] rejected — problem ${problemId}: ${rejection}`);
      redirect(`${back}?spotlightError=${rejection}`);
    }

    const window = spotlightWindow(new Date());
    await getDb()
      .update(challengeProblems)
      .set({
        isSpotlight: true,
        spotlightStartsAt: window.startsAt,
        spotlightEndsAt: window.endsAt,
      })
      // Re-assert 'active' in the predicate so two rapid clicks can't race the guard.
      .where(and(eq(challengeProblems.id, problemId), eq(challengeProblems.status, 'active')));

    console.info(`[spotlight.start] problem ${problemId} — until ${window.endsAt.toISOString()}`);
  } catch (err) {
    rethrowRedirect(err);
    console.error('[spotlight.start]', err);
    redirect(`${back}?spotlightError=internal`);
  }

  revalidateSpotlight();
  redirect(`${back}?spotlight=started`);
}

/**
 * Close a Spotlight early. Only `is_spotlight` flips — the window timestamps
 * stay, so the problem still appears in the "awaiting winner" queue and the
 * eventual win still lands in the right leaderboard week. See the invariant above.
 */
export async function endSpotlightAction(formData: FormData) {
  await requireAdmin();

  const parsed = EndSpotlightSchema.safeParse({ problemId: String(formData.get('problemId') ?? '') });
  if (!parsed.success) redirect('/admin?spotlightError=invalid');

  const { problemId } = parsed.data;
  const back = String(formData.get('returnTo') ?? '/admin');

  try {
    await getDb()
      .update(challengeProblems)
      .set({ isSpotlight: false })
      .where(eq(challengeProblems.id, problemId));

    console.info(`[spotlight.end] problem ${problemId} — closed early, window timestamps kept`);
  } catch (err) {
    rethrowRedirect(err);
    console.error('[spotlight.end]', err);
    redirect(`${back}?spotlightError=internal`);
  }

  revalidateSpotlight();
  redirect(`${back}?spotlight=ended`);
}

/**
 * Crown the winning project and award the seeded 'spotlight-solver' badge to
 * its owner — both in ONE transaction, so a member can never end up with the
 * badge but no recorded win (or the reverse).
 */
export async function pickSpotlightWinnerAction(formData: FormData) {
  await requireAdmin();

  const parsed = PickWinnerSchema.safeParse({
    problemId: String(formData.get('problemId') ?? ''),
    projectId: String(formData.get('projectId') ?? ''),
  });
  if (!parsed.success) redirect('/admin?spotlightError=invalid');

  const { problemId, projectId } = parsed.data;

  try {
    const [problem, linkedIds] = await Promise.all([
      getSpotlightProblem(problemId),
      getLinkedProjectIds(problemId),
    ]);

    const rejection = canPickWinner(problem, projectId, linkedIds);
    if (rejection) {
      console.warn(`[spotlight.winner] rejected — problem ${problemId}, project ${projectId}: ${rejection}`);
      redirect(`/admin?spotlightError=${rejection}`);
    }

    const db = getDb();
    await db.transaction(async (tx) => {
      const [badge] = await tx
        .select({ id: badges.id })
        .from(badges)
        .where(eq(badges.slug, SPOTLIGHT_BADGE_SLUG))
        .limit(1);
      // Seeded by scripts/seed.ts. Fail loudly rather than crown a winner who
      // silently gets no badge — the whole reward is the badge plus the points.
      if (!badge) throw new Error(`[spotlight.winner] '${SPOTLIGHT_BADGE_SLUG}' badge is not seeded`);

      const [owner] = await tx
        .select({ userId: projects.userId })
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);
      if (!owner) throw new Error(`[spotlight.winner] project ${projectId} vanished mid-transaction`);

      await tx
        .update(challengeProblems)
        .set({ spotlightWinnerProjectId: projectId, isSpotlight: false })
        // NOTE: spotlight_ends_at deliberately untouched — the leaderboard reads it.
        .where(eq(challengeProblems.id, problemId));

      await tx
        .insert(userBadges)
        .values({ userId: owner.userId, badgeId: badge.id })
        // A member keeps a single "has won a Spotlight" badge across wins.
        .onConflictDoNothing();
    });

    console.info(`[spotlight.winner] problem ${problemId} — project ${projectId} wins`);
  } catch (err) {
    rethrowRedirect(err);
    console.error('[spotlight.winner]', err);
    redirect('/admin?spotlightError=internal');
  }

  revalidateSpotlight();
  revalidatePath('/leaderboard');
  redirect('/admin?spotlight=winner');
}
