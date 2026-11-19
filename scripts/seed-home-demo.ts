/**
 * Home-dashboard demo seed — idempotent. Run: `npm run db:seed:home`
 * (requires `npm run db:seed` + `npm run db:seed:demo` first).
 *
 * The three newest blocks on /home render NOTHING without matching data, which
 * is correct behaviour but makes them impossible to review. This gives each one
 * real content:
 *
 *   Block 3 «به کمکت نیاز دارند» — domain expertise for the demo viewers in a
 *     domain that actually has a matching challenge (only hr / finance /
 *     customer_success do), plus submitted ideas by OTHER members in it.
 *   Block 5 «تحلیل مخزن پروژه‌ات» — a successful verification_run whose output
 *     deliberately contains one BELOW-threshold skill, so the actionable
 *     "what was missing" line renders rather than the all-clear.
 *   Block 2 Spotlight banner — a live seven-day window on an active problem.
 *
 * Also approves a couple of ideas so the public /ideas directory is not empty.
 *
 * Re-running refreshes timestamps to the current week and leaves base data
 * alone. It writes ONLY demo rows — nothing here belongs in production.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import { and, eq, inArray, isNull, ne } from 'drizzle-orm';
import { getDb } from '../lib/db';
import {
  challenges,
  challengeProblems,
  domains,
  ideas,
  projects,
  skills,
  userDomainExpertise,
  userSkills,
  users,
  verificationRuns,
} from '../lib/db/schema';
import { VERIFICATION_CONFIDENCE_THRESHOLD } from '../lib/verification/rules';

const db = getDb();
const now = new Date();

/** The members whose /home we want to look alive. */
const VIEWERS = ['sara-karimi', 'ali-mohammadi'];
/** Authors of the ideas awaiting validation — never a viewer (you can't validate your own). */
const IDEA_AUTHORS = ['reza-ahmadi', 'kaveh-jafari'];
/** Only these domains have a challenge of the same slug, which the block joins on. */
const DEMO_DOMAIN = 'hr';

type DemoIdea = { slug: string; author: string; title: string; problem: string; solution: string };

const PENDING_IDEAS: DemoIdea[] = [
  {
    slug: 'demo-leave-approval',
    author: 'reza-ahmadi',
    title: 'کوتاه کردن زمان تأیید مرخصی',
    problem:
      'امروز هر درخواست مرخصی باید از سه نفر امضا بگیرد و به‌طور میانگین دو روز کاری طول می‌کشد. کارشناس منابع انسانی روزی حدود یک ساعت صرف پیگیری تلفنی همین امضاها می‌کند و مدیرها هم مدام یادآوری می‌خواهند.',
    solution:
      'یک دستیار که درخواست را می‌خواند، قوانین مرخصی و مانده‌ی مرخصی فرد را بررسی می‌کند، و اگر درخواست با قواعد جاری سازگار بود مسیر تأیید را به یک امضا کاهش می‌دهد. موارد استثنا مثل مرخصی بدون حقوق یا بیش از ده روز همچنان به مسیر کامل می‌روند. خروجی برای کارشناس منابع انسانی یک صف مرتب‌شده است، نه یک صندوق ورودی ایمیل.',
  },
  {
    slug: 'demo-onboarding-checklist',
    author: 'kaveh-jafari',
    title: 'چک‌لیست خودکار ورود کارمند جدید',
    problem:
      'هر کارمند جدید در هفته‌ی اول به‌طور میانگین با هفت نفر مختلف تماس می‌گیرد تا بفهمد به کدام سامانه‌ها دسترسی لازم دارد. این هم وقت خودش را می‌گیرد هم وقت تیم را، و هر بار چیزی جا می‌ماند.',
    solution:
      'با گرفتن عنوان شغلی و تیم، فهرست دسترسی‌ها و آموزش‌های لازم را از روی الگوی افراد مشابه بسازد و به‌صورت یک چک‌لیست سی‌روزه به کارمند و مدیرش بدهد. هر مورد که تیک بخورد، درخواست دسترسی مربوطه هم به‌صورت خودکار ثبت شود تا کسی مجبور به پیگیری دستی نباشد.',
  },
];

async function main() {
  /* ── 0 · resolve the demo actors ─────────────────────────────────── */
  const [org] = await db.select({ id: challenges.orgId }).from(challenges).limit(1);
  if (!org) throw new Error('no challenges found — run `npm run db:seed` first');
  const orgId = org.id;

  const allUsernames = [...VIEWERS, ...IDEA_AUTHORS];
  const people = await db
    .select({ id: users.id, username: users.username })
    .from(users)
    .where(inArray(users.username, allUsernames));
  const byUsername = new Map(people.map((p) => [p.username!, p.id]));
  const missing = allUsernames.filter((u) => !byUsername.has(u));
  if (missing.length) throw new Error(`missing demo users: ${missing.join(', ')} — run \`npm run db:seed:demo\``);

  const [domain] = await db.select().from(domains).where(eq(domains.slug, DEMO_DOMAIN)).limit(1);
  const [challenge] = await db
    .select()
    .from(challenges)
    .where(and(eq(challenges.orgId, orgId), eq(challenges.slug, DEMO_DOMAIN)))
    .limit(1);
  if (!domain || !challenge) throw new Error(`domain/challenge '${DEMO_DOMAIN}' missing — run \`npm run db:seed\``);

  /* ── 1 · Block 3: viewers get domain expertise the block can match ─ */
  await db
    .insert(userDomainExpertise)
    .values(VIEWERS.map((u) => ({ userId: byUsername.get(u)!, domainId: domain.id, yearsExperience: 4 })))
    .onConflictDoNothing();
  console.log(`[seed:home] domain expertise '${DEMO_DOMAIN}' → ${VIEWERS.join(', ')}`);

  /* ── 2 · Block 3: submitted ideas by OTHER members in that challenge ─ */
  for (const d of PENDING_IDEAS) {
    const authorId = byUsername.get(d.author)!;
    const [existing] = await db
      .select({ id: ideas.id })
      .from(ideas)
      .where(and(eq(ideas.userId, authorId), eq(ideas.title, d.title)))
      .limit(1);

    const values = {
      orgId,
      userId: authorId,
      challengeId: challenge.id,
      title: d.title,
      problemStatement: d.problem,
      proposedSolution: d.solution,
      targetUsers: 'کارشناسان منابع انسانی و مدیران مستقیم',
      successCriteria: 'میانگین زمان تأیید از دو روز کاری به کمتر از چهار ساعت برسد.',
      feasibilityNote: 'به دسترسی خواندنی به سامانه‌ی حضور و غیاب نیاز دارد.',
      status: 'submitted' as const,
      updatedAt: now,
    };

    if (existing) await db.update(ideas).set(values).where(eq(ideas.id, existing.id));
    else await db.insert(ideas).values(values);
  }
  console.log(`[seed:home] ${PENDING_IDEAS.length} ideas awaiting validation in '${DEMO_DOMAIN}'`);

  /* ── 3 · /ideas directory: approve any leftover draft/submitted idea ─
     Approving ONE keeps the public directory non-empty while the two above
     stay 'submitted' so the validation block still has work to show. */
  const approvable = await db
    .select({ id: ideas.id })
    .from(ideas)
    .where(
      and(
        eq(ideas.orgId, orgId),
        eq(ideas.status, 'submitted'),
        ne(ideas.title, PENDING_IDEAS[0].title),
        ne(ideas.title, PENDING_IDEAS[1].title),
      ),
    )
    .limit(2);
  if (approvable.length) {
    await db
      .update(ideas)
      .set({ status: 'approved', reviewedAt: now })
      .where(inArray(ideas.id, approvable.map((r) => r.id)));
  }
  console.log(`[seed:home] ${approvable.length} idea(s) approved for the public directory`);

  /* ── 4 · Block 5: a verification run with a real, actionable gap ──── */
  const viewerId = byUsername.get(VIEWERS[0])!;
  const [project] = await db
    .select({ id: projects.id, title: projects.title, githubUrl: projects.githubUrl })
    .from(projects)
    .where(and(eq(projects.userId, viewerId), eq(projects.status, 'published')))
    .limit(1);

  if (!project) {
    console.warn(`[seed:home] ${VIEWERS[0]} has no published project — skipping the verification block`);
  } else {
    // Use skills the member actually claims, so the block's slug→name lookup resolves.
    const claimed = await db
      .select({ slug: skills.slug, name: skills.name })
      .from(userSkills)
      .innerJoin(skills, eq(userSkills.skillId, skills.id))
      .where(eq(userSkills.userId, viewerId))
      .limit(4);

    if (claimed.length < 2) {
      console.warn('[seed:home] not enough claimed skills — skipping the verification block');
    } else {
      // One skill deliberately BELOW threshold so the "what was missing" line
      // renders. An all-clear run would hide the block's whole point.
      const weakest = claimed[claimed.length - 1];
      const output = {
        summary: 'Solid project with clear structure; most claimed skills are evidenced in the repository.',
        verifications: claimed.map((s, i) => {
          const isWeak = s.slug === weakest.slug;
          return {
            skill_slug: s.slug,
            confidence: isWeak ? 0.35 : 0.85 + i * 0.02,
            verdict: isWeak ? ('insufficient' as const) : ('verified' as const),
            evidence: isWeak
              ? 'در README یا ساختار فایل‌ها هیچ نمونه‌ی مستقیمی از این مهارت دیده نشد؛ فقط در توضیح پروژه نام برده شده است.'
              : `شواهد مستقیم در فایل‌های پروژه و پیام‌های commit دیده شد.`,
          };
        }),
      };

      const [existingRun] = await db
        .select({ id: verificationRuns.id })
        .from(verificationRuns)
        .where(eq(verificationRuns.projectId, project.id))
        .limit(1);

      const runValues = {
        userId: viewerId,
        projectId: project.id,
        llmProvider: 'demo.local',
        llmModel: 'gpt-4o',
        githubUrl: project.githubUrl ?? 'https://github.com/example/demo',
        commitSha: 'demo0000000000000000000000000000000000000',
        inputSummary: `${project.title} · ${claimed.length} claimed skill(s) · source=demo-seed`,
        output: output as unknown as Record<string, unknown>,
        status: 'success' as const,
        latencyMs: 4900, // the plan's measured ~4.9s, well under the 10s threshold
        totalTokens: 1840,
        attempts: 1,
        completedAt: now,
      };

      if (existingRun) await db.update(verificationRuns).set(runValues).where(eq(verificationRuns.id, existingRun.id));
      else await db.insert(verificationRuns).values(runValues);

      console.log(
        `[seed:home] verification run for "${project.title}" — ${claimed.length - 1}/${claimed.length} verified, gap on '${weakest.slug}' (threshold ${VERIFICATION_CONFIDENCE_THRESHOLD})`,
      );
    }
  }

  /* ── 5 · Block 2: a live Spotlight window ─────────────────────────── */
  // Clear any stale flag first — exactly one spotlight may be live at a time
  // (DESIGN_SYSTEM §5.8), and the seeded demo leaves an expired one flagged.
  await db.update(challengeProblems).set({ isSpotlight: false }).where(eq(challengeProblems.isSpotlight, true));

  const [problem] = await db
    .select({ id: challengeProblems.id, title: challengeProblems.title })
    .from(challengeProblems)
    .innerJoin(challenges, eq(challengeProblems.challengeId, challenges.id))
    .where(
      and(
        eq(challenges.orgId, orgId),
        eq(challengeProblems.status, 'active'),
        isNull(challengeProblems.spotlightWinnerProjectId),
      ),
    )
    .limit(1);

  if (!problem) {
    console.warn('[seed:home] no active problem available — skipping the Spotlight block');
  } else {
    await db
      .update(challengeProblems)
      .set({
        isSpotlight: true,
        spotlightStartsAt: now,
        spotlightEndsAt: new Date(now.getTime() + 7 * 86_400_000),
      })
      .where(eq(challengeProblems.id, problem.id));
    console.log(`[seed:home] Spotlight live for 7 days on "${problem.title}"`);
  }

  console.log('[seed:home] done — sign in and open /home');
  process.exit(0);
}

main().catch((err) => {
  console.error('[seed:home] failed:', err);
  process.exit(1);
});
