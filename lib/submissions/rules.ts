import { z } from 'zod';

/** IP position a Problem declares (mirrors the `ip_terms` DB enum). */
export type IpTerms = 'developer' | 'organization' | 'shared';

/** Plain-Persian summary of each IP position, shown to the builder before submit. */
export const IP_TERMS_LABEL_FA: Record<IpTerms, string> = {
  developer: 'مالکیت با سازنده می‌ماند',
  organization: 'مالکیت متعلق به سازمان است',
  shared: 'مالکیت مشترک است',
};

/** A real write-up, not a one-liner — enforced hard (min 120), capped at 4000. */
export const SOLUTION_MIN = 120;
export const SOLUTION_MAX = 4000;

/**
 * Submission form validation. `ipTermsAccepted` must be literally `true`,
 * mirroring how `is_personal_project_confirmed` is enforced on projects — an
 * absent/false checkbox fails, it is never auto-accepted.
 */
export const SubmissionFormSchema = z.object({
  projectId: z.uuid(),
  solutionDescription: z
    .string()
    .trim()
    .min(SOLUTION_MIN, { message: 'too_short' })
    .max(SOLUTION_MAX, { message: 'too_long' }),
  ipTermsAccepted: z.literal(true),
});

export type SubmissionForm = z.infer<typeof SubmissionFormSchema>;

export type ProblemStatus = 'pending_review' | 'active' | 'resolved' | 'archived' | 'rejected';

/** Non-form rejection reasons, checked against fetched project/problem state. */
export type SubmissionRejection =
  | 'project_not_found'
  | 'not_owner'
  | 'not_published'
  | 'problem_not_found'
  | 'problem_not_active'
  | 'duplicate';

export type SubmissionGuardInput = {
  currentUserId: string;
  project: { userId: string; status: 'draft' | 'published' } | null;
  problem: { status: ProblemStatus } | null;
  alreadyLinked: boolean;
};

/**
 * Business rules for a submission, independent of the DB/HTTP layer so they can
 * be unit-tested: the project must belong to the current user and be published,
 * the problem must be active, and the pair must not already be linked.
 * Returns a rejection code, or null when the submission is allowed.
 */
export function checkSubmissionAllowed(input: SubmissionGuardInput): SubmissionRejection | null {
  const { currentUserId, project, problem, alreadyLinked } = input;
  if (!project) return 'project_not_found';
  if (project.userId !== currentUserId) return 'not_owner';
  if (project.status !== 'published') return 'not_published';
  if (!problem) return 'problem_not_found';
  if (problem.status !== 'active') return 'problem_not_active';
  if (alreadyLinked) return 'duplicate';
  return null;
}
