/**
 * Weekly-leaderboard demo seed — idempotent. Run: `npm run db:seed:leaderboard`
 * (requires `npm run db:seed` + `npm run db:seed:demo` first — needs org, users,
 * challenges).
 *
 * The base demo data has no activity dated to the *current* week, and domain
 * experts have no projects at all — so the /leaderboard board would look empty.
 * This script gives a curated set of members one "this-week" project each, links
 * some to challenge problems, and casts real upvotes — ALL timestamped inside the
 * current Saturday→Saturday Tehran week. Re-running refreshes those timestamps to
 * the current week (so the demo always looks live) without touching base data.
 *
 * Scoring mirrors lib/leaderboard/scoring.ts: publish +10, challenge link +15,
 * upvote received +2. Targets are chosen so each group (سازنده‌ها / متخصص‌های
 * حوزه‌ای / ترکیبی) has a clear #1.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import { and, eq, isNotNull, sql } from 'drizzle-orm';
import { getDb } from '../lib/db';
import {
  orgs,
  users,
  projects,
  projectAiTools,
  projectChallengeProblems,
  projectUpvotes,
  challenges,
  challengeProblems,
} from '../lib/db/schema';
import { weekWindow } from '../lib/leaderboard/scoring';

const db = getDb();
const activityAt = new Date(); // always inside the current Tehran week

type Stage = 'experiment' | 'weekend_hack' | 'building' | 'shipped' | 'maintained';
type Target = {
  username: string;
  title: string;
  description: string;
  stage: Stage;
  aiTools: string[];
  challenge?: 'hr' | 'finance' | 'customer_success' | 'engineering' | 'general';
  upvotes: number;
};

// Ordered so a walking cursor spreads upvoters across projects. Group membership
// is computed by the app from skills/domains — the comments below note the
// expected group, matching computeRoleBadge for the base demo users.
const TARGETS: Target[] = [
  // ── Builders (no domain expertise) ──
  { username: 'kaveh-jafari', title: 'ارزیاب خودکار خروجی مدل‌ها', description: 'ابزاری که پاسخ چند مدل زبانی را روی یک مجموعه پرسش مقایسه و امتیازدهی می‌کند.', stage: 'building', aiTools: ['claude-code', 'langchain'], challenge: 'general', upvotes: 14 },
  { username: 'reza-ahmadi', title: 'تولیدکننده‌ی توضیحات PR', description: 'از روی diff یک توضیح تمیز و ساختارمند برای Pull Request می‌نویسد.', stage: 'shipped', aiTools: ['claude-code'], challenge: 'engineering', upvotes: 8 },
  { username: 'kian-nikoo', title: 'عامل خلاصه‌سازی جلسات', description: 'عاملی که متن جلسه را می‌گیرد و تصمیم‌ها و اقدام‌های بعدی را استخراج می‌کند.', stage: 'building', aiTools: ['claude-api', 'langchain'], upvotes: 12 },
  { username: 'sara-karimi', title: 'اصلاح‌گر لحن متن فارسی', description: 'ابزاری که لحن یک متن فارسی را رسمی/دوستانه می‌کند بدون تغییر معنا.', stage: 'building', aiTools: ['claude-api'], upvotes: 8 },
  { username: 'leila-ahmadi', title: 'استخراج جدول از تصویر سند', description: 'مدل بینایی که جدول‌های داخل تصویر اسناد اسکن‌شده را به داده‌ی ساختارمند تبدیل می‌کند.', stage: 'building', aiTools: ['hugging-face'], upvotes: 5 },
  { username: 'nazanin-hosseini', title: 'کامپوننت تقویم شمسی دسترس‌پذیر', description: 'یک date-picker شمسی RTL و دسترس‌پذیر برای اپ‌های فارسی.', stage: 'weekend_hack', aiTools: ['v0', 'cursor'], upvotes: 2 },

  // ── Domain Experts (domain expertise, few/no technical skills) ──
  { username: 'maryam-rezaei', title: 'دستیار غربالگری اولیه‌ی رزومه', description: 'با ChatGPT رزومه‌ها را بر اساس معیارهای شفاف شغلی رتبه‌بندی می‌کند — بدون سوگیری.', stage: 'building', aiTools: ['chatgpt'], challenge: 'hr', upvotes: 10 },
  { username: 'farhad-karimi', title: 'خودکارسازی گزارش هزینه‌ی ماهانه', description: 'اقلام هزینه را از متن رسید به دسته‌های حسابداری نگاشت و گزارش می‌سازد.', stage: 'shipped', aiTools: ['chatgpt'], challenge: 'finance', upvotes: 6 },
  { username: 'elham-sadeghi', title: 'تولید پاسخ آماده‌ی تیکت', description: 'برای تیکت‌های پرتکرار پشتیبانی، پیش‌نویس پاسخ می‌سازد تا تیم سریع‌تر جواب دهد.', stage: 'building', aiTools: ['chatgpt'], upvotes: 5 },
  { username: 'golnaz-hosseini', title: 'چک‌لیست هوشمند آن‌بوردینگ', description: 'فرایند آن‌بوردینگ کارمند جدید را گام‌به‌گام هدایت و وضعیت را پیگیری می‌کند.', stage: 'weekend_hack', aiTools: ['chatgpt'], upvotes: 3 },

  // ── Hybrids (domain expertise + ≥3 technical skills) ──
  { username: 'ali-mohammadi', title: 'داشبورد سلامت تحویل تیم', description: 'شاخص‌های تحویل تیم محصول را از داده‌ی مخزن جمع و به‌صورت زنده نشان می‌دهد.', stage: 'building', aiTools: ['cursor', 'v0'], challenge: 'engineering', upvotes: 9 },
  { username: 'mahsa-tehrani', title: 'تقویم محتوای خودکار کمپین', description: 'برای یک کمپین چندکاناله، تقویم محتوا و پیش‌نویس‌ها را تولید می‌کند.', stage: 'building', aiTools: ['chatgpt'], upvotes: 7 },
  { username: 'parisa-karimi', title: 'کیت پروتوتایپ سریع RTL', description: 'مجموعه الگوهای رابط RTL برای ساخت سریع نمونه‌ی اولیه با v0.', stage: 'building', aiTools: ['v0', 'chatgpt'], upvotes: 4 },
];

/** Deterministic voter selection: distinct users other than the owner, rotated by a cursor. */
function pickVoters(allIds: string[], ownerId: string, k: number, cursor: number): string[] {
  const pool = allIds.filter((id) => id !== ownerId);
  const out: string[] = [];
  for (let j = 0; j < Math.min(k, pool.length); j++) out.push(pool[(cursor + j) % pool.length]);
  return [...new Set(out)];
}

async function main() {
  const win = weekWindow(0);
  console.log(`[seed-leaderboard] week ${win.start.toISOString()} → ${win.end.toISOString()} (activity @ ${activityAt.toISOString()})`);

  const [org] = await db.select().from(orgs).where(eq(orgs.slug, 'main-org'));
  if (!org) throw new Error('org missing — run `npm run db:seed` first');

  const allUsers = await db
    .select({ id: users.id, username: users.username })
    .from(users)
    .where(and(eq(users.status, 'active'), eq(users.isAdmin, false), isNotNull(users.username)));
  if (allUsers.length === 0) throw new Error('no members — run `npm run db:seed:demo` first');
  const idByUsername = new Map(allUsers.map((u) => [u.username!, u.id]));
  const allIds = allUsers.map((u) => u.id);

  // First problem per challenge slug (any problem earns the +15 link).
  const problemRows = await db
    .select({ id: challengeProblems.id, slug: challenges.slug, createdAt: challengeProblems.createdAt })
    .from(challengeProblems)
    .innerJoin(challenges, eq(challengeProblems.challengeId, challenges.id))
    .orderBy(challengeProblems.createdAt);
  const firstProblemByChallenge = new Map<string, string>();
  for (const p of problemRows) if (!firstProblemByChallenge.has(p.slug)) firstProblemByChallenge.set(p.slug, p.id);

  let voterCursor = 0;
  let created = 0;
  let skipped = 0;

  for (const t of TARGETS) {
    const ownerId = idByUsername.get(t.username);
    if (!ownerId) {
      console.warn(`[seed-leaderboard] skip — user not found: ${t.username}`);
      skipped += 1;
      continue;
    }

    // Upsert this-week project by (owner, title); always refresh its timestamps to this week.
    const [existing] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.userId, ownerId), eq(projects.title, t.title)))
      .limit(1);
    let projectId: string;
    if (existing) {
      projectId = existing.id;
      await db
        .update(projects)
        .set({ status: 'published', stage: t.stage, createdAt: activityAt, updatedAt: activityAt })
        .where(eq(projects.id, projectId));
    } else {
      const [row] = await db
        .insert(projects)
        .values({
          userId: ownerId,
          orgId: org.id,
          title: t.title,
          description: t.description,
          stage: t.stage,
          status: 'published',
          isPersonalProjectConfirmed: true,
          createdAt: activityAt,
          updatedAt: activityAt,
        })
        .returning({ id: projects.id });
      projectId = row.id;
      created += 1;
    }

    if (t.aiTools.length) {
      await db.insert(projectAiTools).values(t.aiTools.map((toolSlug) => ({ projectId, toolSlug }))).onConflictDoNothing();
    }

    if (t.challenge) {
      const problemId = firstProblemByChallenge.get(t.challenge);
      if (problemId) {
        await db
          .insert(projectChallengeProblems)
          .values({
            projectId,
            challengeProblemId: problemId,
            solutionDescription: `${t.description} — رویکرد، پیاده‌سازی و محدودیت‌ها در توضیحات پروژه آمده است.`,
            ipTermsAcceptedAt: activityAt,
            createdAt: activityAt,
          })
          .onConflictDoNothing();
        await db
          .update(projectChallengeProblems)
          .set({ createdAt: activityAt })
          .where(and(eq(projectChallengeProblems.projectId, projectId), eq(projectChallengeProblems.challengeProblemId, problemId)));
      } else {
        console.warn(`[seed-leaderboard] no problem for challenge '${t.challenge}' — ${t.username} loses the +15 link`);
      }
    }

    // Upvotes: insert distinct voters (idempotent), then pull every upvote on this
    // project into the current week and recompute the denormalized count.
    const voters = pickVoters(allIds, ownerId, t.upvotes, voterCursor);
    voterCursor += t.upvotes;
    if (voters.length) {
      await db.insert(projectUpvotes).values(voters.map((userId) => ({ userId, projectId, createdAt: activityAt }))).onConflictDoNothing();
    }
    await db.update(projectUpvotes).set({ createdAt: activityAt }).where(eq(projectUpvotes.projectId, projectId));
    const [{ c }] = await db
      .select({ c: sql<number>`cast(count(*) as int)` })
      .from(projectUpvotes)
      .where(eq(projectUpvotes.projectId, projectId));
    await db.update(projects).set({ upvoteCount: Number(c) }).where(eq(projects.id, projectId));

    console.log(`[seed-leaderboard] ${t.username}: project${t.challenge ? ' + challenge' : ''} + ${Number(c)} upvotes`);
  }

  console.log(`[seed-leaderboard] done ✅ — ${created} projects created, ${TARGETS.length - skipped} members activated this week`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[seed-leaderboard] failed:', err);
  process.exit(1);
});
