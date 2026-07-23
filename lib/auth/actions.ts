'use server';

import { redirect } from 'next/navigation';
import { eq, or } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { users, orgs } from '@/lib/db/schema';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { createSession, destroySession, requireAdmin } from '@/lib/auth/session';

// Constant-work placeholder so login does one scrypt verify whether or not the
// email exists — closes the user-enumeration timing side-channel.
const DUMMY_HASH = hashPassword('constant-work-placeholder');

export async function loginAction(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  if (!email || !password) redirect('/login?error=invalid');

  const [u] = await getDb().select().from(users).where(eq(users.email, email)).limit(1);
  const passwordOk = u ? verifyPassword(password, u.passwordHash) : (verifyPassword(password, DUMMY_HASH), false);
  if (!u || !passwordOk || u.status === 'inactive') redirect('/login?error=invalid');

  await createSession(u.id);
  redirect(u.isAdmin ? '/admin' : '/home');
}

export async function logoutAction() {
  await destroySession();
  redirect('/');
}

export async function createUserAction(formData: FormData) {
  await requireAdmin();

  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const username = String(formData.get('username') ?? '').trim().toLowerCase();
  const role = String(formData.get('role') ?? 'talent');
  const password = String(formData.get('password') ?? '');
  const roleTitle = String(formData.get('roleTitle') ?? '').trim() || null;

  if (name.length < 2) redirect('/admin/users?error=name');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) redirect('/admin/users?error=email');
  if (!/^[a-z0-9-]{3,32}$/.test(username)) redirect('/admin/users?error=username');
  if (!['talent', 'admin'].includes(role)) redirect('/admin/users?error=role');
  if (password.length < 8) redirect('/admin/users?error=password');

  const db = getDb();
  const [org] = await db.select().from(orgs).where(eq(orgs.slug, 'main-org')).limit(1);
  if (!org) redirect('/admin/users?error=org');

  const conflict = await db
    .select({ id: users.id })
    .from(users)
    .where(or(eq(users.email, email), eq(users.username, username)))
    .limit(1);
  if (conflict.length > 0) redirect('/admin/users?error=exists');

  await db.insert(users).values({
    orgId: org.id,
    email,
    username,
    name,
    roleTitle,
    status: 'active',
    isAdmin: role === 'admin',
    passwordHash: hashPassword(password),
    onboardingCompletedAt: new Date(),
  });

  redirect('/admin/users?created=1');
}
