/**
 * Demo data seed — idempotent. Run: `npm run db:seed:demo`
 * (requires `npm run db:seed` first — needs the org, skills, domains, badges).
 *
 * Seeds 3 demo users that exercise every role_badge and the DE display:
 *   - sara-karimi   → Builder      (technical skills + projects, no domains)
 *   - maryam-rezaei → Domain Expert (HR/Ops domains, only an AI tool, no projects)
 *   - ali-mohammadi → Hybrid       (technical skills + domains + a project)
 *
 * Kept separate from scripts/seed.ts so production can seed taxonomy without
 * demo users.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import { eq } from 'drizzle-orm';
import { getDb } from '../lib/db';
import {
  orgs,
  users,
  skills,
  userSkills,
  domains,
  userDomainExpertise,
  projects,
  projectAiTools,
  badges,
  userBadges,
} from '../lib/db/schema';

const db = getDb();

type Stage = 'experiment' | 'weekend_hack' | 'building' | 'shipped' | 'maintained';

type DemoUser = {
  email: string;
  username: string;
  name: string;
  roleTitle: string;
  bio: string;
  githubUsername?: string;
  onboardingChoice: 'builder' | 'domain_expert' | 'hybrid';
  skills: { slug: string; level: number; verified?: boolean }[];
  domains: { slug: string; years?: number }[];
  projects: { title: string; description: string; stage: Stage; upvotes: number; github?: string; aiTools?: string[] }[];
  badges: string[];
};

const DEMO_USERS: DemoUser[] = [
  {
    email: 'sara.karimi@aigraph.local',
    username: 'sara-karimi',
    name: 'سارا کریمی',
    roleTitle: 'مهندس یادگیری ماشین',
    bio: 'پنج سال سابقه در توسعه مدل‌های NLP فارسی و سیستم‌های توصیه‌گر. علاقه‌مند به تقاطع هوش مصنوعی و تجربه کاربری. در حال ساختن ابزارهایی که یادگیری را برای ایرانیان ساده‌تر می‌کنند.',
    githubUsername: 'sara-karimi',
    onboardingChoice: 'builder',
    skills: [
      { slug: 'python', level: 5, verified: true },
      { slug: 'pytorch', level: 4, verified: true },
      { slug: 'transformers', level: 4, verified: true },
      { slug: 'nlp', level: 4, verified: true },
      { slug: 'fastapi', level: 3 },
      { slug: 'react', level: 3 },
      { slug: 'claude-api', level: 4, verified: true },
      { slug: 'docker', level: 2 },
      { slug: 'postgresql', level: 2 },
      { slug: 'hugging-face', level: 3, verified: true },
    ],
    domains: [],
    projects: [
      {
        title: 'دستیار نوشتاری فارسی',
        description: 'ابزاری برای بهبود متون فارسی با استفاده از مدل‌های زبانی بزرگ',
        stage: 'building',
        upvotes: 47,
        github: 'https://github.com/sara-karimi/persian-writing-assistant',
        aiTools: ['claude-code', 'cursor'],
      },
      {
        title: 'سیستم توصیه‌گر محتوا',
        description: 'موتور پیشنهاد محتوای شخصی‌سازی شده برای پلتفرم‌های آموزشی',
        stage: 'shipped',
        upvotes: 83,
        github: 'https://github.com/sara-karimi/content-recommender',
        aiTools: ['chatgpt'],
      },
    ],
    badges: ['first-project'],
  },
  {
    email: 'maryam.rezaei@aigraph.local',
    username: 'maryam-rezaei',
    name: 'مریم رضایی',
    roleTitle: 'شریک تجاری منابع انسانی',
    bio: 'ده سال تجربه در منابع انسانی و توسعه‌ی سازمانی. علاقه‌مند به استفاده از ابزارهای AI برای بهبود فرایندهای استخدام و آن‌بوردینگ. کد نمی‌نویسم، ولی با ابزارها می‌سازم.',
    onboardingChoice: 'domain_expert',
    skills: [{ slug: 'chatgpt', level: 2 }],
    domains: [
      { slug: 'hr', years: 10 },
      { slug: 'operations', years: 5 },
    ],
    projects: [],
    badges: [],
  },
  {
    email: 'ali.mohammadi@aigraph.local',
    username: 'ali-mohammadi',
    name: 'علی محمدی',
    roleTitle: 'مدیر محصول فنی',
    bio: 'مدیر محصول با پس‌زمینه‌ی مهندسی. بین تیم‌های فنی و کسب‌وکار پل می‌زنم و با ابزارهای AI پروتوتایپ می‌سازم.',
    githubUsername: 'ali-m',
    onboardingChoice: 'hybrid',
    skills: [
      { slug: 'typescript', level: 4, verified: true },
      { slug: 'react', level: 4, verified: true },
      { slug: 'nextjs', level: 4, verified: true },
      { slug: 'nodejs', level: 3 },
      { slug: 'postgresql', level: 3 },
      { slug: 'cursor', level: 3 },
    ],
    domains: [
      { slug: 'product', years: 8 },
      { slug: 'marketing', years: 3 },
    ],
    projects: [
      {
        title: 'داشبورد تحلیل محصول',
        description: 'داشبورد تحلیل رفتار کاربر با نمودارهای زنده برای تیم محصول',
        stage: 'building',
        upvotes: 31,
        github: 'https://github.com/ali-m/product-analytics',
        aiTools: ['cursor', 'v0'],
      },
    ],
    badges: ['first-project'],
  },
];

async function main() {
  console.log('[seed-demo] starting…');
  const [org] = await db.select().from(orgs).where(eq(orgs.slug, 'main-org'));
  if (!org) throw new Error('org missing — run `npm run db:seed` first');

  const skillIdBySlug = new Map((await db.select({ id: skills.id, slug: skills.slug }).from(skills)).map((s) => [s.slug, s.id]));
  const domainIdBySlug = new Map((await db.select({ id: domains.id, slug: domains.slug }).from(domains)).map((d) => [d.slug, d.id]));
  const badgeIdBySlug = new Map((await db.select({ id: badges.id, slug: badges.slug }).from(badges)).map((b) => [b.slug, b.id]));
  if (skillIdBySlug.size === 0 || domainIdBySlug.size === 0) {
    throw new Error('taxonomy is empty — run `npm run db:seed` before `npm run db:seed:demo`');
  }

  for (const du of DEMO_USERS) {
    await db
      .insert(users)
      .values({
        orgId: org.id,
        email: du.email,
        username: du.username,
        name: du.name,
        roleTitle: du.roleTitle,
        bio: du.bio,
        githubUsername: du.githubUsername,
        status: 'active',
        onboardingChoice: du.onboardingChoice,
        onboardingCompletedAt: new Date(),
      })
      .onConflictDoNothing({ target: users.email });
    const [user] = await db.select().from(users).where(eq(users.email, du.email));

    if (du.skills.length) {
      await db
        .insert(userSkills)
        .values(
          du.skills.map((s) => {
            const skillId = skillIdBySlug.get(s.slug);
            if (!skillId) throw new Error(`unknown skill slug: ${s.slug}`);
            return {
              userId: user.id,
              skillId,
              claimedLevel: s.level,
              verified: !!s.verified,
              verificationSource: s.verified ? ('ai_repo_analysis' as const) : null,
              verifiedAt: s.verified ? new Date() : null,
            };
          }),
        )
        .onConflictDoNothing();
    }

    if (du.domains.length) {
      await db
        .insert(userDomainExpertise)
        .values(
          du.domains.map((d) => {
            const domainId = domainIdBySlug.get(d.slug);
            if (!domainId) throw new Error(`unknown domain slug: ${d.slug}`);
            return { userId: user.id, domainId, yearsExperience: d.years ?? null };
          }),
        )
        .onConflictDoNothing();
    }

    // Projects have no natural unique key — seed atomically, and only if the
    // user has none yet, so a partially-failed run rolls back instead of
    // leaving a half-inserted set that the count guard would then skip forever.
    if (du.projects.length) {
      await db.transaction(async (tx) => {
        const existingProject = await tx.select({ id: projects.id }).from(projects).where(eq(projects.userId, user.id)).limit(1);
        if (existingProject.length > 0) return;
        for (const p of du.projects) {
          const [proj] = await tx
            .insert(projects)
            .values({
              userId: user.id,
              title: p.title,
              description: p.description,
              stage: p.stage,
              upvoteCount: p.upvotes,
              status: 'published',
              isPersonalProjectConfirmed: true,
              githubUrl: p.github,
            })
            .returning({ id: projects.id });
          if (p.aiTools?.length) {
            await tx.insert(projectAiTools).values(p.aiTools.map((t) => ({ projectId: proj.id, toolSlug: t }))).onConflictDoNothing();
          }
        }
      });
    }

    if (du.badges.length) {
      await db
        .insert(userBadges)
        .values(
          du.badges.map((b) => {
            const badgeId = badgeIdBySlug.get(b);
            if (!badgeId) throw new Error(`unknown badge slug: ${b}`);
            return { userId: user.id, badgeId };
          }),
        )
        .onConflictDoNothing();
    }

    console.log(`[seed-demo] ${du.username}: ${du.skills.length} skills, ${du.domains.length} domains, ${du.projects.length} projects, ${du.badges.length} badges`);
  }

  console.log('[seed-demo] done ✅');
  process.exit(0);
}

main().catch((err) => {
  console.error('[seed-demo] failed:', err);
  process.exit(1);
});
