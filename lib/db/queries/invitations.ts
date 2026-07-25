import { cache } from 'react';
import { desc, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { invitations } from '@/lib/db/schema';

export type InvitationRow = {
  id: string;
  email: string;
  personaHint: 'builder' | 'domain_expert' | 'hybrid' | 'unknown';
  status: 'pending' | 'accepted' | 'expired';
  expiresAt: Date;
  createdAt: Date;
};

/** Admin list, newest first. Org-scoped per CODE_CONVENTIONS §4. */
export const listInvitations = cache(async (orgId: string): Promise<InvitationRow[]> => {
  return getDb()
    .select({
      id: invitations.id,
      email: invitations.email,
      personaHint: invitations.personaHint,
      status: invitations.status,
      expiresAt: invitations.expiresAt,
      createdAt: invitations.createdAt,
    })
    .from(invitations)
    .where(eq(invitations.orgId, orgId))
    .orderBy(desc(invitations.createdAt));
});

/** Lookup by TOKEN HASH — invite tokens are stored hashed at rest, like
 *  session tokens (only the link the admin copies carries the raw token). */
export async function findInvitationByTokenHash(tokenHash: string) {
  const [row] = await getDb()
    .select({
      id: invitations.id,
      orgId: invitations.orgId,
      email: invitations.email,
      personaHint: invitations.personaHint,
      status: invitations.status,
      expiresAt: invitations.expiresAt,
    })
    .from(invitations)
    .where(eq(invitations.token, tokenHash))
    .limit(1);
  return row ?? null;
}
