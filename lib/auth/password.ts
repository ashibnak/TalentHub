import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

// Async scrypt so hashing/verifying never blocks the event loop (a burst of bad
// logins would otherwise freeze the single Node process). Storage format is
// unchanged — `salt:hash` (hex) — so hashes written by the old scryptSync code
// still verify.
const scryptAsync = promisify(scrypt);
const KEYLEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = (await scryptAsync(password, salt, KEYLEN)) as Buffer;
  return `${salt}:${hash.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const hashBuf = Buffer.from(hash, 'hex');
  const testBuf = (await scryptAsync(password, salt, KEYLEN)) as Buffer;
  return hashBuf.length === testBuf.length && timingSafeEqual(hashBuf, testBuf);
}
