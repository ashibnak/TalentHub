import { cache } from 'react';
import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { sessions, users } from '@/lib/db/schema';

const COOKIE = 'aigraph_session';
const MAX_AGE_S = 60 * 60 * 24 * 7; // 7 days

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  username: string | null;
  isAdmin: boolean;
  accountType: 'talent' | 'sponsor';
};

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + MAX_AGE_S * 1000);
  await getDb().insert(sessions).values({ id: token, userId, expiresAt });
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_S,
  });
}

/** Current signed-in user (or null). Request-scoped cached. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;

  const [row] = await getDb()
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      username: users.username,
      isAdmin: users.isAdmin,
      accountType: users.accountType,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, token))
    .limit(1);

  if (!row || row.expiresAt.getTime() < Date.now()) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    username: row.username,
    isAdmin: row.isAdmin,
    accountType: row.accountType,
  };
});

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) {
    await getDb().delete(sessions).where(eq(sessions.id, token));
    store.delete(COOKIE);
  }
}

/** Gate any signed-in page/action. Redirects to /login if not signed in. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

/** Gate an admin-only page/segment. Redirects to /login if not an admin. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) redirect('/login');
  return user;
}
