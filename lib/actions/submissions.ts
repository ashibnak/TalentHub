'use server';

import { redirect } from 'next/navigation';
import { revalidatePath, revalidateTag } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { projects, challengeProblems, projectChallengeProblems } from '@/lib/db/schema';
import { requireUser } from '@/lib/auth/session';
import { SubmissionFormSchema, checkSubmissionAllowed } from '@/lib/submissions/rules';

/**
 * Form state returned to the client (via useActionState) on any non-success
 * outcome, so field errors render inline and the write-up/selection are never
 * lost. Success and auth still redirect (they never return here).
 */
export type SubmitState = {
  error?: string;
  values?: { projectId: string; solutionDescription: string; ipTermsAccepted: boolean };
};

/** Map a Zod failure to a short error code the form renders in Persian. */
function formErrorCode(issues: readonly { path: PropertyKey[]; message: string }[]): string {
  if (issues.some((i) => i.path[0] === 'ipTermsAccepted')) return 'ip_terms';
  const solution = issues.find((i) => i.path[0] === 'solutionDescription');
  if (solution) return solution.message === 'too_long' ? 'too_long' : 'too_short';
  if (issues.some((i) => i.path[0] === 'projectId')) return 'project_invalid';
  return 'invalid';
}

/**
 * Submit one of the current user's published projects to an active challenge
 * problem, accepting the problem's IP terms. Zod-validated; all rules in
 * lib/submissions/rules.ts. On validation failure or a business rejection it
 * RETURNS { error, values } (input preserved); it only redirects on success or
 * when auth/structure is missing.
 */
export async function submitProjectToProblemAction(_prev: SubmitState, formData: FormData): Promise<SubmitState> {
  const user = await requireUser();

  const slug = String(formData.get('slug') ?? '');
  const problemId = String(formData.get('problemId') ?? '');
  if (!slug || !problemId) redirect('/challenges');
  const back = `/challenges/${slug}/${problemId}`;

  const values = {
    projectId: String(formData.get('projectId') ?? ''),
    solutionDescription: String(formData.get('solutionDescription') ?? ''),
    ipTermsAccepted: formData.get('ipTermsAccepted') === 'on',
  };

  const parsed = SubmissionFormSchema.safeParse(values);
  if (!parsed.success) return { error: formErrorCode(parsed.error.issues), values };

  try {
    const db = getDb();
    const [project] = await db
      .select({ userId: projects.userId, status: projects.status })
      .from(projects)
      .where(eq(projects.id, parsed.data.projectId))
      .limit(1);
    const [problem] = await db
      .select({ status: challengeProblems.status })
      .from(challengeProblems)
      .where(eq(challengeProblems.id, problemId))
      .limit(1);
    const [linked] = await db
      .select({ projectId: projectChallengeProblems.projectId })
      .from(projectChallengeProblems)
      .where(
        and(
          eq(projectChallengeProblems.projectId, parsed.data.projectId),
          eq(projectChallengeProblems.challengeProblemId, problemId),
        ),
      )
      .limit(1);

    const rejection = checkSubmissionAllowed({
      currentUserId: user.id,
      project: project ?? null,
      problem: problem ?? null,
      alreadyLinked: !!linked,
    });
    if (rejection) return { error: rejection, values };

    await db.insert(projectChallengeProblems).values({
      projectId: parsed.data.projectId,
      challengeProblemId: problemId,
      solutionDescription: parsed.data.solutionDescription,
      ipTermsAcceptedAt: new Date(),
    });
  } catch (err) {
    console.error('[submissions.submit]', err);
    return { error: 'internal', values };
  }

  revalidatePath(back);
  revalidateTag('leaderboard'); // challenge submissions feed the weekly score
  redirect(`${back}?submitted=1`);
}
