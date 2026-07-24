import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hashToken, newSessionToken } from './session-token.ts';

describe('session token hashing', () => {
  it('is deterministic and returns a 64-char sha256 hex digest', () => {
    const token = 'a'.repeat(64);
    const h = hashToken(token);
    assert.equal(h, hashToken(token)); // stable
    assert.match(h, /^[0-9a-f]{64}$/);
  });

  it('never returns the raw token (so a stored hash is not a usable cookie)', () => {
    const token = newSessionToken();
    assert.notEqual(hashToken(token), token);
  });

  it('maps different tokens to different hashes', () => {
    assert.notEqual(hashToken('token-one'), hashToken('token-two'));
  });

  it('generates unique, 64-hex-char tokens', () => {
    const a = newSessionToken();
    const b = newSessionToken();
    assert.match(a, /^[0-9a-f]{64}$/);
    assert.notEqual(a, b);
  });
});
