'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { and, eq, notInArray } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { ideas } from '@/lib/db/schema';
import { requireUser } from '@/lib/auth/session';
import { getIdeaOwnership, isSelectableChallenge } from '@/lib/db/queries/ideas';
import {
  deleteRejection,
  editRejection,
  parseIdeaForm,
  submitRejection,
  type IdeaFieldErrors,
  type IdeaFormValues,
} from '@/lib/ideas/rules';

/**
 * Returned to the client via useActionState on any non-success outcome, so
 * field errors render inline and six fields of typing are never lost. Success
 * redirects and never returns here.
 */
export type IdeaFormState = {
  /** Per-field codes the form maps to Persian helper text. */
  errors?: IdeaFieldErrors;
  /** Form-level code (business rejection / internal), shown above the fields. */
  error?: string;
  values?: IdeaFormValues;
};

/** Resolve the optional challenge selection, or a field error if it isn't eligible. */
async function resolveChallengeId(
  orgId: string,
  challengeId: string | null,
): Promise<{ ok: true; id: string | null } | { ok: false }> {
  if (!challengeId) return { ok: true, id: null };
  return (await isSelectableChallenge(orgId, challengeId)) ? { ok: true, id: challengeId } : { ok: false };
}

/**
 * Create an idea. Always saved as a DRAFT — submitting is a separate, explicit
 * step so an author can leave and come back before a reviewer ever sees it.
 */
export async function createIdeaAction(_prev: IdeaFormState, formData: FormData): Promise<IdeaFormState> {
  const user = await requireUser();

  const parsed = parseIdeaForm(formData);
  if (!parsed.ok) return { errors: parsed.errors, values: parsed.values };

  let newId: string;
  try {
    const challenge = await resolveChallengeId(user.orgId, parsed.data.challengeId);
    if (!challenge.ok) return { errors: { challengeId: 'invalid' }, values: parsed.values };

    const [row] = await getDb()
      .insert(ideas)
      .values({
        orgId: user.orgId,
        userId: user.id,
        challengeId: challenge.id,
        title: parsed.data.title,
        problemStatement: parsed.data.problemStatement,
        proposedSolution: parsed.data.proposedSolution,
        targetUsers: parsed.data.targetUsers,
        successCriteria: parsed.data.successCriteria,
        feasibilityNote: parsed.data.feasibilityNote,
        ipTerms: parsed.data.ipTerms,
        status: 'draft',
      })
      .returning({ id: ideas.id });
    newId = row.id;
  } catch (err) {
    console.error('[ideas.create]', err);
    return { error: 'internal', values: parsed.values };
  }

  revalidatePath('/ideas');
  redirect(`/ideas/${newId}?saved=1`);
}

/** Owner edits their own idea. Allowed only while it is still a draft. */
export async function updateIdeaAction(_prev: IdeaFormState, formData: FormData): Promise<IdeaFormState> {
  const user = await requireUser();

  const ideaId = String(formData.get('ideaId') ?? '');
  if (!ideaId) redirect('/ideas');

  const parsed = parseIdeaForm(formData);
  // `values` is the raw input either way, so a guard rejection below still
  // hands the form back everything the author typed.
  const values = parsed.values;
  if (!parsed.ok) return { errors: parsed.errors, values };

  try {
    const rejection = editRejection({ currentUserId: user.id, idea: await getIdeaOwnership(ideaId) });
    if (rejection) return { error: rejection, values };

    const challenge = await resolveChallengeId(user.orgId, parsed.data.challengeId);
    if (!challenge.ok) return { errors: { challengeId: 'invalid' }, values };

    await getDb()
      .update(ideas)
      .set({
        challengeId: challenge.id,
        title: parsed.data.title,
        problemStatement: parsed.data.problemStatement,
        proposedSolution: parsed.data.proposedSolution,
        targetUsers: parsed.data.targetUsers,
        successCriteria: parsed.data.successCriteria,
        feasibilityNote: parsed.data.feasibilityNote,
        ipTerms: parsed.data.ipTerms,
        updatedAt: new Date(),
      })
      // org_id and the not-yet-decided condition in the predicate as well as the
      // guard above — defence in depth, and it keeps phase-2 multi-tenancy a
      // no-op here.
      .where(
        and(
          eq(ideas.id, ideaId),
          eq(ideas.userId, user.id),
          eq(ideas.orgId, user.orgId),
          notInArray(ideas.status, ['approved', 'rejected']),
        ),
      );
  } catch (err) {
    console.error('[ideas.update]', err);
    return { error: 'internal', values };
  }

  revalidatePath('/ideas');
  revalidatePath(`/ideas/${ideaId}`);
  redirect(`/ideas/${ideaId}?saved=1`);
}

/**
 * Draft → submitted. One-way and one-time: submitting locks editing so a
 * reviewer never assesses a moving target. A plain button action (no
 * useActionState) — there is no input to preserve.
 */
export async function submitIdeaAction(formData: FormData) {
  const user = await requireUser();

  const ideaId = String(formData.get('ideaId') ?? '');
  if (!ideaId) redirect('/ideas');

  try {
    const rejection = submitRejection({ currentUserId: user.id, idea: await getIdeaOwnership(ideaId) });
    if (rejection) redirect(`/ideas/${ideaId}?error=${rejection}`);

    await getDb()
      .update(ideas)
      .set({ status: 'submitted', updatedAt: new Date() })
      // Re-assert draft in the predicate so two rapid clicks can't double-submit.
      .where(
        and(eq(ideas.id, ideaId), eq(ideas.userId, user.id), eq(ideas.orgId, user.orgId), eq(ideas.status, 'draft')),
      );
  } catch (err) {
    // redirect() throws internally — re-throw so Next can handle the navigation.
    if (err && typeof err === 'object' && 'digest' in err && String((err as { digest: unknown }).digest).startsWith('NEXT_REDIRECT'))
      throw err;
    console.error('[ideas.submit]', err);
    redirect(`/ideas/${ideaId}?error=internal`);
  }

  revalidatePath('/ideas');
  revalidatePath(`/ideas/${ideaId}`);
  redirect(`/ideas/${ideaId}?submitted=1`);
}

/**
 * Delete a DRAFT idea. Draft-only on purpose: once submitted, the idea is in a
 * reviewer's queue and part of their workload, so it is withdrawn by decision
 * (needs_work / rejected) rather than yanked out from under them.
 */
export async function deleteIdeaAction(formData: FormData) {
  const user = await requireUser();

  const ideaId = String(formData.get('ideaId') ?? '');
  if (!ideaId) redirect('/ideas/mine');

  try {
    const rejection = deleteRejection({ currentUserId: user.id, idea: await getIdeaOwnership(ideaId) });
    if (rejection) redirect(`/ideas/${ideaId}?error=${rejection}`);

    await getDb()
      .delete(ideas)
      // Re-assert owner + draft in the predicate so a race can't delete a
      // just-submitted idea.
      .where(
        and(
          eq(ideas.id, ideaId),
          eq(ideas.userId, user.id),
          eq(ideas.orgId, user.orgId),
          eq(ideas.status, 'draft'),
        ),
      );
    console.info(`[ideas.delete] idea ${ideaId} deleted by ${user.id}`);
  } catch (err) {
    // redirect() throws internally — re-throw so Next can handle the navigation.
    if (err && typeof err === 'object' && 'digest' in err && String((err as { digest: unknown }).digest).startsWith('NEXT_REDIRECT'))
      throw err;
    console.error('[ideas.delete]', err);
    redirect(`/ideas/${ideaId}?error=internal`);
  }

  revalidatePath('/ideas');
  revalidatePath('/ideas/mine');
  redirect('/ideas/mine?deleted=1');
}
