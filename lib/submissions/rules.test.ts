import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SubmissionFormSchema, checkSubmissionAllowed, SOLUTION_MIN } from './rules.ts';

const UID = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const PROJECT = '33333333-3333-4333-8333-333333333333';
const goodSolution = 'س'.repeat(SOLUTION_MIN + 10); // comfortably over the minimum

const validForm = { projectId: PROJECT, solutionDescription: goodSolution, ipTermsAccepted: true as const };
const publishedProject = { userId: UID, status: 'published' as const };
const activeProblem = { status: 'active' as const };

describe('SubmissionFormSchema', () => {
  it('accepts a valid submission (happy path)', () => {
    const parsed = SubmissionFormSchema.safeParse(validForm);
    assert.equal(parsed.success, true);
  });

  it('rejects a too-short solution_description', () => {
    const parsed = SubmissionFormSchema.safeParse({ ...validForm, solutionDescription: 'خیلی کوتاه' });
    assert.equal(parsed.success, false);
    assert.ok(parsed.error!.issues.some((i) => i.path[0] === 'solutionDescription'));
  });

  it('rejects when the IP-terms checkbox is not accepted', () => {
    const parsed = SubmissionFormSchema.safeParse({ ...validForm, ipTermsAccepted: false });
    assert.equal(parsed.success, false);
    assert.ok(parsed.error!.issues.some((i) => i.path[0] === 'ipTermsAccepted'));
  });
});

describe('checkSubmissionAllowed', () => {
  it('allows a published project owned by the user on an active problem', () => {
    assert.equal(
      checkSubmissionAllowed({ currentUserId: UID, project: publishedProject, problem: activeProblem, alreadyLinked: false }),
      null,
    );
  });

  it('rejects an unpublished (draft) project', () => {
    assert.equal(
      checkSubmissionAllowed({
        currentUserId: UID,
        project: { userId: UID, status: 'draft' },
        problem: activeProblem,
        alreadyLinked: false,
      }),
      'not_published',
    );
  });

  it("rejects a project the user does not own", () => {
    assert.equal(
      checkSubmissionAllowed({
        currentUserId: UID,
        project: { userId: OTHER, status: 'published' },
        problem: activeProblem,
        alreadyLinked: false,
      }),
      'not_owner',
    );
  });

  it('rejects a duplicate submission (already linked)', () => {
    assert.equal(
      checkSubmissionAllowed({ currentUserId: UID, project: publishedProject, problem: activeProblem, alreadyLinked: true }),
      'duplicate',
    );
  });

  it('rejects submitting to a non-active problem', () => {
    assert.equal(
      checkSubmissionAllowed({
        currentUserId: UID,
        project: publishedProject,
        problem: { status: 'archived' },
        alreadyLinked: false,
      }),
      'problem_not_active',
    );
  });
});
