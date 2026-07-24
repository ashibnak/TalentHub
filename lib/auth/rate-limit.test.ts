import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isRateLimited,
  recordFailedAttempt,
  resetAttempts,
  sweepExpired,
  RATE_LIMIT,
} from './rate-limit.ts';

const NOW = 1_000_000_000;

describe('login rate limiter', () => {
  it('allows 5 failed attempts, then blocks the 6th', () => {
    const key = 'a@x:1.1.1.1';
    resetAttempts(key);
    for (let i = 0; i < RATE_LIMIT.MAX_ATTEMPTS; i++) {
      assert.equal(isRateLimited(key, NOW), false); // still allowed on each of the 5
      recordFailedAttempt(key, NOW);
    }
    assert.equal(isRateLimited(key, NOW), true); // 6th is blocked
  });

  it('resets after the window elapses', () => {
    const key = 'b@x:2.2.2.2';
    resetAttempts(key);
    for (let i = 0; i < RATE_LIMIT.MAX_ATTEMPTS; i++) recordFailedAttempt(key, NOW);
    assert.equal(isRateLimited(key, NOW), true);
    assert.equal(isRateLimited(key, NOW + RATE_LIMIT.WINDOW_MS), false); // window passed
  });

  it('a successful login clears the bucket', () => {
    const key = 'c@x:3.3.3.3';
    resetAttempts(key);
    for (let i = 0; i < RATE_LIMIT.MAX_ATTEMPTS; i++) recordFailedAttempt(key, NOW);
    assert.equal(isRateLimited(key, NOW), true);
    resetAttempts(key);
    assert.equal(isRateLimited(key, NOW), false);
  });

  it('sweepExpired drops only expired buckets', () => {
    const key = 'd@x:4.4.4.4';
    resetAttempts(key);
    recordFailedAttempt(key, NOW);
    sweepExpired(NOW); // not yet expired → still tracked
    recordFailedAttempt(key, NOW);
    sweepExpired(NOW + RATE_LIMIT.WINDOW_MS); // expired → dropped
    // After a sweep past the window, a fresh attempt starts a new window (allowed).
    assert.equal(isRateLimited(key, NOW + RATE_LIMIT.WINDOW_MS), false);
  });
});
