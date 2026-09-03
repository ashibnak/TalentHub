'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { invitations, users } from '@/lib/db/schema';
import { requireAdmin, createSession, getCurrentUser } from '@/lib/auth/session';
import { newSessionToken, hashToken } from '@/lib/auth/session-token';
import { hashPassword } from '@/lib/auth/password';
import { getMainOrgId } from '@/lib/db/queries/org';
import { findInvitationByTokenHash } from '@/lib/db/queries/invitations';
import { parseCreateInviteForm, parseAcceptInviteForm, checkInviteUsable, INVITE_TTL_MS } from '@/lib/invitations/rules';

/** Admin creates an invite; the raw token is surfaced ONCE via the redirect so
 *  the page can render the shareable link (no SMTP in phase 1 — the admin
 *  shares the link manually). Only the sha256 hash is stored. */
export async function createInviteAction(formData: FormData) {
  const admin = await requireAdmin();

  const parsed = parseCreateInviteForm(formData);
  if ('error' in parsed) redirect(`/admin/users?error=invite_${parsed.error}`);

  const db = getDb();
  const orgId = await getMainOrgId();
  if (!orgId) redirect('/admin/users?error=invite_org');

  // An existing sign-in account for this email makes an invite pointless.
  const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, parsed.email)).limit(1);
  if (existingUser) redirect('/admin/users?error=invite_user_exists');

  // One live invite per email — atomically expire older pending ones and
  // insert the replacement (concurrent creates can't leave two live invites).
  const rawToken = newSessionToken();
  await db.transaction(async (tx) => {
    await tx
      .update(invitations)
      .set({ status: 'expired' })
      .where(and(eq(invitations.orgId, orgId), eq(invitations.email, parsed.email), eq(invitations.status, 'pending')));
    await tx.insert(invitations).values({
      orgId,
      email: parsed.email,
      token: hashToken(rawToken),
      invitedBy: admin.id,
      personaHint: parsed.personaHint,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    });
  });

  revalidatePath('/admin/users');
  redirect(`/admin/users?invite_token=${rawToken}&invite_email=${encodeURIComponent(parsed.email)}`);
}

/** Admin revokes a pending invite. */
export async function revokeInviteAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get('invitationId') ?? '');
  if (!id) redirect('/admin/users');

  await getDb()
    .update(invitations)
    .set({ status: 'expired' })
    .where(and(eq(invitations.id, id), eq(invitations.status, 'pending')));
  revalidatePath('/admin/users');
  redirect('/admin/users?revoked=1');
}

export type AcceptInviteState = {
  error?: string;
  values?: { name: string; username: string };
};

/** The invited person sets up their account (useActionState — preserves input
 *  on failure). On success: session starts and the onboarding wizard begins. */
export async function acceptInviteAction(_prev: AcceptInviteState, formData: FormData): Promise<AcceptInviteState> {
  const token = String(formData.get('token') ?? '');
  if (!token) redirect('/login');

  // Echo values back before validation so a failed submit keeps the input.
  const values = {
    name: String(formData.get('name') ?? ''),
    username: String(formData.get('username') ?? ''),
  };

  const existing = await getCurrentUser();
  if (existing) redirect(existing.isAdmin ? '/admin' : '/home');

  const parsed = parseAcceptInviteForm(formData);
  if ('error' in parsed) return { error: parsed.error, values };

  // All fallible work inside try; the redirect happens after it so NEXT_REDIRECT
  // never crosses the catch.
  let userId: string | null = null;
  try {
    const db = getDb();
    const invitation = await findInvitationByTokenHash(hashToken(token));
    const rejection = checkInviteUsable({ invitation });
    if (rejection) return { error: rejection, values };

    // Conflict checks (someone may have taken the email/username meanwhile).
    const [emailTaken] = await db.select({ id: users.id }).from(users).where(eq(users.email, invitation!.email)).limit(1);
    if (emailTaken) return { error: 'email_taken', values };
    const [usernameTaken] = await db.select({ id: users.id }).from(users).where(eq(users.username, parsed.username)).limit(1);
    if (usernameTaken) return { error: 'username_taken', values };

    const passwordHash = await hashPassword(parsed.password);

    userId = await db.transaction(async (tx) => {
      // Atomically consume the invite — a second concurrent accept sees 0 rows.
      const consumed = await tx
        .update(invitations)
        .set({ status: 'accepted' })
        .where(and(eq(invitations.id, invitation!.id), eq(invitations.status, 'pending')))
        .returning({ id: invitations.id });
      if (consumed.length === 0) throw new Error('invite_consumed');

      const [row] = await tx
        .insert(users)
        .values({
          orgId: invitation!.orgId,
          email: invitation!.email,
          username: parsed.username,
          name: parsed.name,
          status: 'active',
          passwordHash,
          // onboardingCompletedAt stays null → requireUser funnels to /onboarding.
        })
        .returning({ id: users.id });
      return row.id;
    });
  } catch (err) {
    if (err instanceof Error && err.message === 'invite_consumed') return { error: 'used', values };
    console.error('[invitations.accept]', err);
    return { error: 'internal', values };
  }

  await createSession(userId);
  revalidatePath('/admin/users');
  redirect('/onboarding');
}
