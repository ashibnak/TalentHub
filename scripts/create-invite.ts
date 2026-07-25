/**
 * Create an invite link from the CLI (plan Week 2 Prompt 2).
 *
 *   npm run invite:new -- --email=someone@company.com --persona=domain_expert
 *
 * Personas: builder | domain_expert | hybrid | unknown (default).
 * Prints the one-time link (7-day expiry). The token is stored hashed at rest.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import { and, eq } from 'drizzle-orm';
import { getDb } from '../lib/db';
import { orgs, users, invitations } from '../lib/db/schema';
import { newSessionToken, hashToken } from '../lib/auth/session-token';
import { CreateInviteSchema, INVITE_TTL_MS } from '../lib/invitations/rules';

const arg = (name: string): string | undefined => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3);
};

async function main() {
  const parsed = CreateInviteSchema.safeParse({
    email: (arg('email') ?? '').trim().toLowerCase(),
    personaHint: arg('persona') ?? 'unknown',
  });
  if (!parsed.success) {
    console.error('[invite:new] usage: npm run invite:new -- --email=x@y.com [--persona=builder|domain_expert|hybrid|unknown]');
    process.exit(1);
  }
  const { email, personaHint } = parsed.data;

  const db = getDb();
  const [org] = await db.select({ id: orgs.id }).from(orgs).where(eq(orgs.slug, 'main-org')).limit(1);
  if (!org) throw new Error('main-org not seeded — run `npm run db:seed` first');

  const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existingUser) throw new Error(`a user with ${email} already exists — no invite needed`);

  await db
    .update(invitations)
    .set({ status: 'expired' })
    .where(and(eq(invitations.orgId, org.id), eq(invitations.email, email), eq(invitations.status, 'pending')));

  const rawToken = newSessionToken();
  await db.insert(invitations).values({
    orgId: org.id,
    email,
    token: hashToken(rawToken),
    personaHint,
    expiresAt: new Date(Date.now() + INVITE_TTL_MS),
  });

  const base = process.env.APP_URL ?? 'https://talenthub-production-3507.up.railway.app';
  console.log(`[invite:new] ${email} (${personaHint})`);
  console.log(`${base}/invite/${rawToken}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[invite:new] failed:', err);
  process.exit(1);
});
