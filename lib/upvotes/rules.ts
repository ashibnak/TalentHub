import { z } from 'zod';

/** Toggle-upvote input — just the project id, validated as a uuid. */
export const UpvoteInputSchema = z.object({ projectId: z.uuid() });

export type UpvoteRejection = 'not_published' | 'self_upvote';

/**
 * Server-side upvote guard (independent of DB/HTTP so it's unit-testable):
 * only published projects can be upvoted, and never your own. Returns a
 * rejection code, or null when the toggle is allowed.
 */
export function checkUpvoteAllowed(input: {
  actorId: string;
  ownerId: string;
  status: 'draft' | 'published';
}): UpvoteRejection | null {
  if (input.status !== 'published') return 'not_published';
  if (input.actorId === input.ownerId) return 'self_upvote';
  return null;
}

/**
 * Pure model of the count derivation used by the action: the count is the size
 * of the SET of voter ids, recomputed from the actual rows — never an
 * increment — so a double-submit cannot inflate it. Toggling flips membership.
 */
export function toggleVoter(voters: readonly string[], actorId: string): { count: number; hasUpvoted: boolean } {
  const set = new Set(voters);
  if (set.has(actorId)) set.delete(actorId);
  else set.add(actorId);
  return { count: set.size, hasUpvoted: set.has(actorId) };
}

/** Idempotent add (mirrors insert … on conflict do nothing): re-adding a voter keeps the count. */
export function addVoter(voters: readonly string[], actorId: string): number {
  const set = new Set(voters);
  set.add(actorId);
  return set.size;
}
