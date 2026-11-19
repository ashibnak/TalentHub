import { z } from 'zod';
import { IP_TERMS_VALUES, type IpTerms } from '@/lib/submissions/rules';

/**
 * Idea intake rules — pure, Zod-backed, unit-tested (same shape as
 * lib/projects/rules.ts and lib/submissions/rules.ts).
 *
 * Why the fields are constrained: an unstructured submission costs the reviewer
 * 15–30 minutes just to decode intent, and review here is one person against a
 * 48h target. Structure is the bottleneck fix.
 *
 * Why there are only five required fields: this feature exists for the people
 * who don't write code. A 15-field form drives away exactly those users, so
 * `feasibility_note` and `challenge_id` stay optional and nothing else is added
 * without deleting something first.
 */

export type IdeaStatus = 'draft' | 'submitted' | 'needs_work' | 'approved' | 'rejected';

/** Deliberate limits — do not loosen. Also drive the form's live counters. */
export const IDEA_LIMITS = {
  title: { min: 1, max: 80 },
  problemStatement: { min: 100, max: 600 },
  proposedSolution: { min: 150, max: 1500 },
  targetUsers: { min: 1, max: 200 },
  successCriteria: { min: 1, max: 300 },
  feasibilityNote: { min: 0, max: 500 },
} as const;

export type IdeaField = keyof typeof IDEA_LIMITS;

/** Per-field failure codes; the form maps them to Persian helper text. */
export type IdeaErrorCode = 'required' | 'too_short' | 'too_long';
export type IdeaFieldErrors = Partial<Record<IdeaField | 'challengeId', IdeaErrorCode | 'invalid'>>;

/** Raw form input, kept verbatim so a failed submit can repopulate the form. */
export type IdeaFormValues = {
  title: string;
  problemStatement: string;
  proposedSolution: string;
  targetUsers: string;
  successCriteria: string;
  feasibilityNote: string;
  challengeId: string;
  ipTerms: string;
};

/** Validated, trimmed values ready for the DB. */
export type IdeaInput = {
  title: string;
  problemStatement: string;
  proposedSolution: string;
  targetUsers: string;
  successCriteria: string;
  feasibilityNote: string | null;
  challengeId: string | null;
  ipTerms: IpTerms;
};

const bounded = (field: IdeaField) =>
  z
    .string()
    .trim()
    .min(IDEA_LIMITS[field].min, { message: IDEA_LIMITS[field].min <= 1 ? 'required' : 'too_short' })
    .max(IDEA_LIMITS[field].max, { message: 'too_long' });

export const IdeaFormSchema = z.object({
  title: bounded('title'),
  problemStatement: bounded('problemStatement'),
  proposedSolution: bounded('proposedSolution'),
  targetUsers: bounded('targetUsers'),
  successCriteria: bounded('successCriteria'),
  // Optional: an empty string is normalised to null rather than failing.
  feasibilityNote: z
    .string()
    .trim()
    .max(IDEA_LIMITS.feasibilityNote.max, { message: 'too_long' })
    .transform((v) => v || null)
    .nullable(),
  // Optional link to a Challenge. Existence/eligibility is checked in the
  // action against the DB — this only rejects a malformed id.
  challengeId: z.uuid({ message: 'invalid' }).nullable(),
  // Ownership position, declared at intake. An absent/unknown value falls back
  // to 'developer' — the ordinary case, and the DB default — rather than
  // failing the whole form over a field most authors will never touch.
  ipTerms: z.enum(IP_TERMS_VALUES).catch('developer'),
});

export type ParsedIdeaForm =
  | { ok: true; values: IdeaFormValues; data: IdeaInput }
  | { ok: false; values: IdeaFormValues; errors: IdeaFieldErrors };

/** Pull the raw strings out of a FormData, untrimmed and unvalidated. */
export function readIdeaForm(formData: FormData): IdeaFormValues {
  const str = (key: string) => String(formData.get(key) ?? '');
  return {
    title: str('title'),
    problemStatement: str('problemStatement'),
    proposedSolution: str('proposedSolution'),
    targetUsers: str('targetUsers'),
    successCriteria: str('successCriteria'),
    feasibilityNote: str('feasibilityNote'),
    challengeId: str('challengeId'),
    ipTerms: str('ipTerms'),
  };
}

/**
 * Parse + validate the idea form. On failure returns EVERY failing field (not
 * just the first): with six fields, fixing them one round-trip at a time is a
 * good way to lose a non-technical submitter halfway through.
 */
export function parseIdeaForm(formData: FormData): ParsedIdeaForm {
  const values = readIdeaForm(formData);

  const parsed = IdeaFormSchema.safeParse({
    ...values,
    feasibilityNote: values.feasibilityNote,
    challengeId: values.challengeId.trim() || null,
    ipTerms: values.ipTerms.trim() || 'developer',
  });

  if (!parsed.success) {
    const errors: IdeaFieldErrors = {};
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0]) as IdeaField | 'challengeId';
      // First issue per field wins — they are emitted in schema order.
      if (errors[field]) continue;
      const message = issue.message;
      errors[field] =
        message === 'required' || message === 'too_short' || message === 'too_long' || message === 'invalid'
          ? message
          : 'invalid';
    }
    return { ok: false, values, errors };
  }

  return { ok: true, values, data: parsed.data };
}

/* ─────────────────────────── Lifecycle rules ─────────────────────── */

export type IdeaRejection = 'not_found' | 'not_owner' | 'locked' | 'not_draft';

export type IdeaGuardInput = {
  currentUserId: string;
  idea: { userId: string; status: IdeaStatus } | null;
};

/** Terminal states — a decision has been made and the idea is now a record. */
const DECIDED: readonly IdeaStatus[] = ['approved', 'rejected'];

/**
 * Why editing stays open after submission: `needs_work` exists precisely so an
 * author can fix and resubmit, and a submission sitting in a 48h queue is still
 * the author's to improve. Editing closes only once a decision is final —
 * approved or rejected — because at that point the idea is a record of what was
 * judged, not a draft.
 *
 * Ownership is checked BEFORE status so a stranger never learns the state of
 * someone else's idea from the error code.
 */
export function editRejection(input: IdeaGuardInput): IdeaRejection | null {
  const { currentUserId, idea } = input;
  if (!idea) return 'not_found';
  if (idea.userId !== currentUserId) return 'not_owner';
  if (DECIDED.includes(idea.status)) return 'locked';
  return null;
}

/** Submitting is owner-only and only ever moves draft → submitted. */
export function submitRejection(input: IdeaGuardInput): IdeaRejection | null {
  const { currentUserId, idea } = input;
  if (!idea) return 'not_found';
  if (idea.userId !== currentUserId) return 'not_owner';
  if (idea.status !== 'draft') return 'not_draft';
  return null;
}

/** Deleting is owner-only and draft-only — a submitted idea is the reviewer's
 *  workload too, so it is withdrawn by decision, never yanked out from under. */
export function deleteRejection(input: IdeaGuardInput): IdeaRejection | null {
  const { currentUserId, idea } = input;
  if (!idea) return 'not_found';
  if (idea.userId !== currentUserId) return 'not_owner';
  if (idea.status !== 'draft') return 'not_draft';
  return null;
}

/** Boolean forms for the UI — one source of truth, no duplicated conditions. */
export const canEdit = (input: IdeaGuardInput): boolean => editRejection(input) === null;
export const canSubmit = (input: IdeaGuardInput): boolean => submitRejection(input) === null;
export const canDelete = (input: IdeaGuardInput): boolean => deleteRejection(input) === null;

/* ────────────────────────────── Visibility ───────────────────────── */

/** The only status the public directory shows. */
export const PUBLIC_IDEA_STATUS: IdeaStatus = 'approved';

/** Whether an idea belongs in the public /ideas directory. */
export function isPubliclyVisible(status: IdeaStatus): boolean {
  return status === PUBLIC_IDEA_STATUS;
}

/**
 * Whether a viewer may open an idea's detail page: approved ideas are public,
 * everything else is the author's alone until it is.
 */
export function canViewIdea(status: IdeaStatus, ownerId: string, viewerId: string | null): boolean {
  return isPubliclyVisible(status) || (!!viewerId && viewerId === ownerId);
}

/* ───────────────────────────── Display helper ────────────────────── */

/** First line of the problem statement — the one-line teaser on a directory card. */
export function ideaSummaryLine(problemStatement: string): string {
  const [first] = problemStatement.trim().split(/\r?\n/);
  return (first ?? '').trim();
}
