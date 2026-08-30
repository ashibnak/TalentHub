'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/session';
import { startProjectVerification } from '@/lib/verification/run';

/**
 * Admin re-runs verification for one project. Bypasses the 3-failure failsafe
 * on purpose: the failsafe exists to stop an unattended retry loop, not to stop
 * a human who has just fixed the repo URL or the gateway key.
 */
export async function retryVerificationAction(formData: FormData) {
  await requireAdmin();

  const projectId = String(formData.get('projectId') ?? '');
  if (!projectId) redirect('/admin/verifications?error=missing_project');

  try {
    const outcome = await startProjectVerification(projectId, { force: true });
    revalidatePath('/admin/verifications');
    redirect(outcome.started ? '/admin/verifications?retried=1' : `/admin/verifications?error=${outcome.reason}`);
  } catch (err) {
    // redirect() throws internally — re-throw so Next can handle the navigation.
    if (err && typeof err === 'object' && 'digest' in err && String((err as { digest: unknown }).digest).startsWith('NEXT_REDIRECT'))
      throw err;
    console.error('[verification.retry]', err);
    redirect('/admin/verifications?error=retry_failed');
  }
}
