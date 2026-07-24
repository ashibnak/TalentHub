import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseCreateUserForm } from './rules.ts';

function fd(entries: [string, string][]): FormData {
  const f = new FormData();
  for (const [k, v] of entries) f.append(k, v);
  return f;
}

describe('create-user rules', () => {
  it('accepts a valid user and lowercases email/username (happy path)', () => {
    const r = parseCreateUserForm(
      fd([
        ['name', 'Sara'],
        ['email', 'Sara@Example.com'],
        ['username', 'Sara-K'],
        ['role', 'talent'],
        ['password', 'longenough8'],
      ]),
    );
    assert.ok(!('error' in r));
    if ('error' in r) return;
    assert.equal(r.email, 'sara@example.com');
    assert.equal(r.username, 'sara-k');
    assert.equal(r.role, 'talent');
  });

  it('rejects a malformed email with code "email"', () => {
    const r = parseCreateUserForm(
      fd([
        ['name', 'Sara'],
        ['email', 'notanemail'],
        ['username', 'sara-k'],
        ['role', 'talent'],
        ['password', 'longenough8'],
      ]),
    );
    assert.deepEqual(r, { error: 'email' });
  });
});
