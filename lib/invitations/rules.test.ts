import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCreateInviteForm, parseAcceptInviteForm, checkInviteUsable, INVITE_TTL_MS } from './rules.ts';

const fd = (entries: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
};

test('parseCreateInviteForm: happy path lowercases email', () => {
  const r = parseCreateInviteForm(fd({ email: 'Ali@Example.COM', personaHint: 'builder' }));
  assert.ok(!('error' in r));
  if (!('error' in r)) {
    assert.equal(r.email, 'ali@example.com');
    assert.equal(r.personaHint, 'builder');
  }
});

test('parseCreateInviteForm: bad email -> email code', () => {
  const r = parseCreateInviteForm(fd({ email: 'not-an-email', personaHint: 'unknown' }));
  assert.deepEqual(r, { error: 'email' });
});

test('parseCreateInviteForm: bad persona -> persona code', () => {
  const r = parseCreateInviteForm(fd({ email: 'a@b.co', personaHint: 'wizard' }));
  assert.deepEqual(r, { error: 'persona' });
});

test('parseAcceptInviteForm: happy path', () => {
  const r = parseAcceptInviteForm(fd({ name: 'سارا کریمی', username: 'Sara-Karimi2', password: 'password1', passwordConfirm: 'password1' }));
  assert.ok(!('error' in r));
  if (!('error' in r)) assert.equal(r.username, 'sara-karimi2');
});

test('parseAcceptInviteForm: mismatch -> password_mismatch', () => {
  const r = parseAcceptInviteForm(fd({ name: 'سارا', username: 'sara', password: 'password1', passwordConfirm: 'password2' }));
  assert.deepEqual(r, { error: 'password_mismatch' });
});

test('parseAcceptInviteForm: short password wins over mismatch (field order)', () => {
  const r = parseAcceptInviteForm(fd({ name: 'سارا', username: 'sara', password: 'short', passwordConfirm: 'different' }));
  assert.deepEqual(r, { error: 'password' });
});

test('checkInviteUsable: pending & fresh -> null', () => {
  const now = new Date('2026-07-25T12:00:00Z');
  const invitation = { status: 'pending' as const, expiresAt: new Date(now.getTime() + INVITE_TTL_MS) };
  assert.equal(checkInviteUsable({ invitation, now }), null);
});

test('checkInviteUsable: rejections', () => {
  const now = new Date('2026-07-25T12:00:00Z');
  assert.equal(checkInviteUsable({ invitation: null, now }), 'not_found');
  assert.equal(checkInviteUsable({ invitation: { status: 'accepted', expiresAt: new Date(now.getTime() + 1000) }, now }), 'used');
  assert.equal(checkInviteUsable({ invitation: { status: 'expired', expiresAt: new Date(now.getTime() + 1000) }, now }), 'expired');
  assert.equal(checkInviteUsable({ invitation: { status: 'pending', expiresAt: new Date(now.getTime() - 1000) }, now }), 'expired');
});
