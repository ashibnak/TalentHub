'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { eq, or } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { users, orgs } from '@/lib/db/schema';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { parseCreateUserForm } from '@/lib/auth/rules';
import { isRateLimited, recordFailedAttempt, resetAttempts } from '@/lib/auth/rate-limit';
import { createSession, destroySession, requireAdmin } from '@/lib/auth/session';

// Constant-work placeholder so login does one scrypt verify whether or not the
// email exists — closes the user-enumeration timing side-channel. Computed once,
// lazily (hashing is async now).
let dummyHashPromise: Promise<string> | null = null;
const getDummyHash = () => (dummyHashPromise ??= hashPassword('constant-work-placeholder'));

export async function loginAction(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  if (!email || !password) redirect('/login?error=invalid');

  // Throttle brute force: max 5 failed attempts per email+IP per 15 minutes.
  const fwd = (await headers()).get('x-forwarded-for') ?? '';
  const ip = fwd.split(',')[0].trim() || 'unknown';
  const key = `${email}:${ip}`;
  if (isRateLimited(key)) {
    console.warn(`[auth.login] rate-limited: ${email} from ${ip}`);
    redirect('/login?error=rate_limited');
  }

  const [u] = await getDb().select().from(users).where(eq(users.email, email)).limit(1);
  const passwordOk = u
    ? await verifyPassword(password, u.passwordHash)
    : (await verifyPassword(password, await getDummyHash()), false);
  if (!u || !passwordOk || u.status === 'inactive') {
    recordFailedAttempt(key);
    redirect('/login?error=invalid');
  }

  resetAttempts(key);
  await createSession(u.id);
  redirect(u.isAdmin ? '/admin' : '/home');
}

export async function logoutAction() {
  await destroySession();
  redirect('/');
}

export async function createUserAction(formData: FormData) {
  await requireAdmin();

  const parsed = parseCreateUserForm(formData);
  if ('error' in parsed) redirect(`/admin/users?error=${parsed.error}`);
  const { name, email, username, role, password, roleTitle } = parsed;

  const db = getDb();
  const [org] = await db.select().from(orgs).where(eq(orgs.slug, 'main-org')).limit(1);
  if (!org) redirect('/admin/users?error=org');

  const conflict = await db
    .select({ id: users.id })
    .from(users)
    .where(or(eq(users.email, email), eq(users.username, username)))
    .limit(1);
  if (conflict.length > 0) redirect('/admin/users?error=exists');

  const passwordHash = await hashPassword(password);
  await db.insert(users).values({
    orgId: org.id,
    email,
    username,
    name,
    roleTitle,
    status: 'active',
    isAdmin: role === 'admin',
    passwordHash,
    onboardingCompletedAt: new Date(),
  });

  redirect('/admin/users?created=1');
}
