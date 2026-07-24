import { createHash, randomBytes } from 'node:crypto';

// Session tokens are stored HASHED at rest: the raw token lives only in the
// user's cookie, and sessions.id holds sha256(token). A DB/backup leak then
// yields no usable cookies. sha256 (not scrypt) is right here — the token is
// 256 bits of entropy, so there's nothing to brute-force and lookups stay fast.

/** A fresh, opaque session token (raw value — goes in the cookie only). */
export function newSessionToken(): string {
  return randomBytes(32).toString('hex');
}

/** Hash a raw token for storage/lookup in sessions.id. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
