/**
 * Demo seed for the opportunities/applications loop. Idempotent.
 * Run after db:seed + db:seed:demo:  npm run db:seed:opps
 *
 * Creates a Sponsor, a few opportunities, applications across every funnel
 * stage, and sets known passwords on a couple of demo accounts so you can log
 * in and try each role.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import { eq, inArray } from 'drizzle-orm';
import { getDb } from '../lib/db';
import { orgs, users, opportunities, applications, opportunitySkills, skills } from '../lib/db/schema';
import { hashPassword } from '../lib/auth/password';

const db = getDb();

const SPONSOR = {
  email: 'sepideh@aigraph.local',
  username: 'sepideh-kaveh',
  name: 'سپیده کاوه',
  roleTitle: 'مدیر جذب استعداد',
  password: 'sponsor1234',
};

// username -> login password (so these demo accounts can sign in)
const TALENT_LOGINS: Record<string, string> = {
  'sara-karimi': 'talent1234',
  'kaveh-jafari': 'talent1234',
};

const OPPS = [
  { key: 'ai', title: 'مهندس هوش مصنوعی ارشد', description: 'به دنبال مهندسی که با LLM و RAG سیستم‌های تولیدی ساخته باشد. تسلط بر Python و کار با ابزارهای AI الزامی است.' },
  { key: 'fs', title: 'توسعه‌دهنده‌ی فول‌استک محصول', description: 'برای تیم محصول، توسعه‌دهنده‌ای که با Next.js و TypeScript سریع بسازد و با ابزارهای AI پروتوتایپ بزند.' },
  { key: 'data', title: 'تحلیل‌گر داده و مالی', description: 'تحلیل‌گر داده با پس‌زمینه‌ی مالی برای پروژه‌های پیش‌بینی بودجه و مدل‌سازی.' },
];

// Required skills per opportunity — the matching basis (mirrors migration 0004's backfill).
const OPP_SKILLS: Record<string, string[]> = {
  ai: ['python', 'rag', 'nlp', 'machine-learning', 'prompt-engineering'],
  fs: ['typescript', 'nextjs', 'react', 'tailwind-css'],
  data: ['python', 'sql', 'machine-learning', 'deep-learning'],
};

type Stage = 'applied' | 'shortlisted' | 'next_call' | 'accepted' | 'rejected';
const APPS: { username: string; opp: string; status: Stage; note: string }[] = [
  { username: 'kaveh-jafari', opp: 'ai', status: 'next_call', note: 'روی چند سیستم RAG تولیدی کار کرده‌ام.' },
  { username: 'sara-karimi', opp: 'ai', status: 'shortlisted', note: 'تمرکزم NLP فارسی و مدل‌های زبانی است.' },
  { username: 'reza-ahmadi', opp: 'ai', status: 'applied', note: 'بک‌اند و زیرساخت سرویس‌های AI.' },
  { username: 'nazanin-hosseini', opp: 'fs', status: 'next_call', note: 'فرانت‌اند با تمرکز روی تجربه‌ی کاربری.' },
  { username: 'ali-mohammadi', opp: 'fs', status: 'applied', note: 'پس‌زمینه‌ی مهندسی + محصول.' },
  { username: 'mahsa-tehrani', opp: 'fs', status: 'rejected', note: 'بیشتر سمت رشد و بازاریابی هستم.' },
  { username: 'shirin-moradi', opp: 'data', status: 'accepted', note: 'مدل پیش‌بینی بودجه ساخته‌ام.' },
];

async function main() {
  const [org] = await db.select().from(orgs).where(eq(orgs.slug, 'main-org'));
  if (!org) throw new Error('run `npm run db:seed` first');

  // 1. Sponsor (+ password)
  await db
    .insert(users)
    .values({
      orgId: org.id, email: SPONSOR.email, username: SPONSOR.username, name: SPONSOR.name,
      roleTitle: SPONSOR.roleTitle, status: 'active', accountType: 'sponsor',
      passwordHash: hashPassword(SPONSOR.password), onboardingCompletedAt: new Date(),
    })
    .onConflictDoNothing({ target: users.email });
  await db.update(users).set({ passwordHash: hashPassword(SPONSOR.password), accountType: 'sponsor' }).where(eq(users.email, SPONSOR.email));
  const [sponsor] = await db.select().from(users).where(eq(users.email, SPONSOR.email));
  console.log(`[opps] sponsor ready: ${SPONSOR.username}`);

  // 2. Login passwords for demo talent
  for (const [username, pw] of Object.entries(TALENT_LOGINS)) {
    await db.update(users).set({ passwordHash: hashPassword(pw) }).where(eq(users.username, username));
  }
  console.log(`[opps] set login passwords for: ${Object.keys(TALENT_LOGINS).join(', ')}`);

  // 3. Opportunities (only if the sponsor has none yet)
  const existingOpps = await db.select({ id: opportunities.id }).from(opportunities).where(eq(opportunities.sponsorId, sponsor.id)).limit(1);
  const oppIdByKey = new Map<string, string>();
  if (existingOpps.length === 0) {
    for (const o of OPPS) {
      const [row] = await db.insert(opportunities).values({ orgId: org.id, sponsorId: sponsor.id, title: o.title, description: o.description }).returning({ id: opportunities.id });
      oppIdByKey.set(o.key, row.id);
    }
    console.log(`[opps] created ${OPPS.length} opportunities`);
  } else {
    // reload existing keyed by title
    const rows = await db.select({ id: opportunities.id, title: opportunities.title }).from(opportunities).where(eq(opportunities.sponsorId, sponsor.id));
    for (const o of OPPS) {
      const match = rows.find((r) => r.title === o.title);
      if (match) oppIdByKey.set(o.key, match.id);
    }
    console.log('[opps] opportunities already exist, reusing');
  }

  // 3b. Required skills (idempotent)
  for (const [key, slugs] of Object.entries(OPP_SKILLS)) {
    const opportunityId = oppIdByKey.get(key);
    if (!opportunityId) continue;
    const skillRows = await db.select({ id: skills.id }).from(skills).where(inArray(skills.slug, slugs));
    if (skillRows.length) {
      await db.insert(opportunitySkills).values(skillRows.map((s) => ({ opportunityId, skillId: s.id }))).onConflictDoNothing();
    }
  }
  console.log('[opps] required skills synced');

  // 4. Applications (only if none exist yet)
  const anyApp = await db.select({ id: applications.id }).from(applications).limit(1);
  if (anyApp.length === 0) {
    const usernames = [...new Set(APPS.map((a) => a.username))];
    const userRows = await db.select({ id: users.id, username: users.username }).from(users).where(inArray(users.username, usernames));
    const idByUsername = new Map(userRows.map((u) => [u.username!, u.id]));
    let n = 0;
    for (const a of APPS) {
      const applicantId = idByUsername.get(a.username);
      const opportunityId = oppIdByKey.get(a.opp);
      if (!applicantId || !opportunityId) continue;
      await db.insert(applications).values({ opportunityId, applicantId, coverNote: a.note, status: a.status }).onConflictDoNothing();
      n += 1;
    }
    console.log(`[opps] created ${n} applications across the funnel`);
  } else {
    console.log('[opps] applications already exist, skipping');
  }

  console.log('[opps] done ✅');
  process.exit(0);
}

main().catch((err) => {
  console.error('[opps] failed:', err);
  process.exit(1);
});
