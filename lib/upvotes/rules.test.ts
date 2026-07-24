import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { checkUpvoteAllowed, toggleVoter, addVoter } from './rules.ts';

const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OWNER = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

describe('toggleVoter (count derived from the voter set)', () => {
  it('toggle on → count 1, hasUpvoted true', () => {
    assert.deepEqual(toggleVoter([], A), { count: 1, hasUpvoted: true });
  });

  it('toggle off → count 0, hasUpvoted false', () => {
    assert.deepEqual(toggleVoter([A], A), { count: 0, hasUpvoted: false });
  });

  it('a second voter is counted independently', () => {
    assert.deepEqual(toggleVoter([OWNER], A), { count: 2, hasUpvoted: true });
  });
});

describe('addVoter (double-submit does not double-count)', () => {
  it('re-adding the same voter keeps the count at 1', () => {
    assert.equal(addVoter([A], A), 1);
    assert.equal(addVoter([], A), 1);
  });
});

describe('checkUpvoteAllowed', () => {
  it('allows upvoting someone else’s published project', () => {
    assert.equal(checkUpvoteAllowed({ actorId: A, ownerId: OWNER, status: 'published' }), null);
  });

  it('rejects a self-upvote', () => {
    assert.equal(checkUpvoteAllowed({ actorId: A, ownerId: A, status: 'published' }), 'self_upvote');
  });

  it('rejects an unpublished project', () => {
    assert.equal(checkUpvoteAllowed({ actorId: A, ownerId: OWNER, status: 'draft' }), 'not_published');
  });
});
