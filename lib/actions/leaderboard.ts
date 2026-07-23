'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/session';
import { freezeWeek } from '@/lib/db/queries/leaderboard';
import { weekWindow } from '@/lib/leaderboard/scoring';

/**
 * Admin closes the just-ended week: freezes its standings into snapshots and
 * awards the Top-of-the-Week badge. Mirrors how admins already pick the weekly
 * Spotlight winner by hand — no cron needed in phase 1.
 */
export async function freezeLastWeekAction() {
  await requireAdmin();
  try {
    const summary = await freezeWeek(weekWindow(-1));
    revalidatePath('/leaderboard');
    revalidatePath('/admin');
    redirect(`/admin?frozen=${summary.totalRanked}`);
  } catch (err) {
    // redirect() throws internally — re-throw so Next can handle the navigation.
    if (err && typeof err === 'object' && 'digest' in err && String((err as { digest: unknown }).digest).startsWith('NEXT_REDIRECT'))
      throw err;
    console.error('[leaderboard.freeze]', err);
    redirect('/admin?error=freeze_failed');
  }
}
