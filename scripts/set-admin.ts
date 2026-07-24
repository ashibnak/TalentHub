/**
 * Bootstrap / reset the admin login. Run:
 *   ADMIN_PASSWORD='...' npm run admin:set
 * Optional: ADMIN_EMAIL, ADMIN_NAME, ADMIN_USERNAME.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import { eq } from 'drizzle-orm';
import { getDb } from '../lib/db';
import { users, orgs } from '../lib/db/schema';
import { hashPassword } from '../lib/auth/password';

const db = getDb();

async function main() {
  const email = (process.env.ADMIN_EMAIL || 'admin@aigraph.local').toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'مدیر سیستم';
  const username = process.env.ADMIN_USERNAME || 'admin';
  if (!password || password.length < 8) throw new Error('set ADMIN_PASSWORD (≥ 8 chars)');

  const [org] = await db.select().from(orgs).where(eq(orgs.slug, 'main-org'));
  if (!org) throw new Error('org missing — run `npm run db:seed` first');

  const passwordHash = await hashPassword(password);
  const [existing] = await db.select().from(users).where(eq(users.email, email));
  if (existing) {
    await db.update(users).set({ passwordHash, isAdmin: true, status: 'active' }).where(eq(users.id, existing.id));
    console.log(`[admin] password set for existing user ${email}`);
  } else {
    await db.insert(users).values({
      orgId: org.id, email, username, name, isAdmin: true, status: 'active',
      passwordHash, onboardingCompletedAt: new Date(),
    });
    console.log(`[admin] created admin ${email} (username: ${username})`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('[admin] failed:', err);
  process.exit(1);
});
