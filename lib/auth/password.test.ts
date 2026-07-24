import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { scryptSync, randomBytes } from 'node:crypto';
import { hashPassword, verifyPassword } from './password.ts';

// A hash produced the OLD (synchronous) way, to prove format compatibility.
function legacyHash(password: string): string {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

describe('password hashing', () => {
  it('verifies a hash it produced (roundtrip)', async () => {
    const stored = await hashPassword('correct horse battery');
    assert.equal(await verifyPassword('correct horse battery', stored), true);
    assert.equal(await verifyPassword('wrong password', stored), false);
  });

  it('still verifies a legacy scryptSync hash (same salt:hash format)', async () => {
    const legacy = legacyHash('aigraph123');
    assert.equal(await verifyPassword('aigraph123', legacy), true);
    assert.equal(await verifyPassword('nope', legacy), false);
  });

  it('rejects null / malformed stored values', async () => {
    assert.equal(await verifyPassword('x', null), false);
    assert.equal(await verifyPassword('x', 'not-a-valid-hash'), false);
  });
});
