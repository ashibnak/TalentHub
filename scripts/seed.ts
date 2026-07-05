/**
 * Seed script — idempotent. Run: `npm run db:seed`
 *
 * Seeds the phase-1 foundation data: the single org ('main-org'), the skills
 * taxonomy, the 11 domains, the 5 launch Challenges + starter Problems, and the
 * 3 auto-awarded badges. Safe to run repeatedly (conflicts are ignored).
 *
 * Note: challenge slugs deliberately match domain slugs (hr, finance,
 * customer_success) so the "Domain experts in this area" query on a Challenge
 * page (plan §3.5) resolves. `engineering` and `general` have no matching
 * domain, so their DE section is simply empty — that's expected.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
config(); // .env fallback

import { eq } from 'drizzle-orm';
import { getDb } from '../lib/db';
import {
  orgs,
  users,
  skills,
  domains,
  challenges,
  challengeProblems,
  badges,
} from '../lib/db/schema';

const db = getDb();

const MAIN_ORG_SLUG = 'main-org';

// ── Skills taxonomy (extend toward ~150 over time — plan Week 3 Prompt 1) ──
const SPECIAL_SLUGS: Record<string, string> = { '.NET': 'dotnet' };
const slugify = (name: string): string =>
  SPECIAL_SLUGS[name] ??
  name
    .toLowerCase()
    .replace(/\+/g, '-plus')
    .replace(/#/g, '-sharp')
    .replace(/\./g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

type SkillCat = 'language' | 'framework' | 'tool' | 'concept' | 'ai_tool';
const SKILLS: Record<SkillCat, string[]> = {
  language: ['Python', 'TypeScript', 'JavaScript', 'Go', 'Rust', 'Java', 'C#', 'C++', 'PHP', 'Ruby', 'Kotlin', 'Swift', 'SQL'],
  framework: ['React', 'Next.js', 'Vue', 'Svelte', 'Angular', 'Node.js', 'Express', 'NestJS', 'Django', 'FastAPI', 'Flask', 'Laravel', 'Spring', '.NET', 'Tailwind CSS', 'React Native'],
  tool: ['Docker', 'Kubernetes', 'Git', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'Nginx', 'Linux', 'AWS', 'GCP', 'Terraform', 'GitHub Actions', 'Kafka'],
  concept: ['RAG', 'AI Agents', 'Prompt Engineering', 'Fine-tuning', 'Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision', 'MLOps', 'Vector Databases', 'LLM Evaluation', 'System Design', 'Microservices', 'REST API', 'GraphQL'],
  ai_tool: ['Cursor', 'Claude Code', 'GitHub Copilot', 'ChatGPT', 'Claude API', 'OpenAI API', 'Lovable', 'v0', 'Bolt', 'Windsurf', 'Hugging Face', 'LangChain', 'Ollama', 'Replit'],
};

// ── 11 domains (plan Week 3 Prompt 5) — Persian · English ──
const DOMAINS: { slug: string; name: string }[] = [
  { slug: 'hr', name: 'منابع انسانی · Human Resources' },
  { slug: 'finance', name: 'مالی و حسابداری · Finance' },
  { slug: 'marketing', name: 'بازاریابی · Marketing' },
  { slug: 'legal', name: 'حقوقی · Legal' },
  { slug: 'operations', name: 'عملیات · Operations' },
  { slug: 'sales', name: 'فروش · Sales' },
  { slug: 'customer_success', name: 'پشتیبانی مشتری · Customer Success' },
  { slug: 'product', name: 'محصول · Product' },
  { slug: 'healthcare', name: 'سلامت · Healthcare' },
  { slug: 'education', name: 'آموزش · Education' },
  { slug: 'other', name: 'سایر · Other' },
];

// ── 5 launch Challenges (plan §3.5) ──
const CHALLENGES: { slug: string; title: string; description: string; sponsorTeam: string | null }[] = [
  { slug: 'hr', title: 'چالش منابع انسانی', description: 'مشکلات حوزه‌ی منابع انسانی که با ابزارهای AI قابل حل‌اند — از غربالگری رزومه تا آن‌بوردینگ.', sponsorTeam: 'HR Business Partners' },
  { slug: 'finance', title: 'چالش مالی', description: 'مشکلات حوزه‌ی مالی و حسابداری — تحلیل هزینه، پیش‌بینی بودجه، و اتوماسیون گزارش‌ها.', sponsorTeam: 'Finance' },
  { slug: 'customer_success', title: 'چالش پشتیبانی مشتری', description: 'مشکلات پشتیبانی و موفقیت مشتری — دسته‌بندی تیکت، تولید پاسخ، و دانش‌نامه.', sponsorTeam: 'Customer Success' },
  { slug: 'engineering', title: 'چالش مهندسی', description: 'ابزارهای داخلی و بهره‌وری توسعه‌دهنده — از خلاصه‌ی code review تا تولید مستندات.', sponsorTeam: 'Engineering' },
  { slug: 'general', title: 'عمومی', description: 'مشکلاتی که در دسته‌ی خاصی نمی‌گنجند. جای شروع خوبی برای اولین پروژه.', sponsorTeam: null },
];

// ── Starter Problems (the "first 10", plan Week 8 Prompt 10) ──
const PROBLEMS: Record<string, { title: string; description: string }[]> = {
  hr: [
    { title: 'ابزار غربالگری خودکار رزومه', description: 'ابزاری که رزومه‌ها را بر اساس معیارهای شغلی رتبه‌بندی کند. راه‌حل خوب: شفاف، قابل توضیح، و بدون سوگیری. غیر-proprietary.' },
    { title: 'بات چک‌لیست آن‌بوردینگ', description: 'دستیاری که فرایند آن‌بوردینگ کارمند جدید را گام‌به‌گام هدایت کند و وضعیت را پیگیری کند.' },
  ],
  finance: [
    { title: 'دسته‌بندی خودکار گزارش هزینه', description: 'ابزاری که اقلام هزینه را از روی متن رسید/توضیح به دسته‌های حسابداری نگاشت کند.' },
    { title: 'دستیار پیش‌بینی بودجه', description: 'مدلی ساده که بر اساس داده‌ی تاریخی، روند بودجه‌ی سه‌ماهه‌ی بعد را تخمین بزند.' },
  ],
  customer_success: [
    { title: 'دسته‌بند تیکت‌های پشتیبانی', description: 'طبقه‌بندی خودکار تیکت‌های ورودی بر اساس موضوع و اولویت.' },
    { title: 'تولید FAQ از تیکت‌های گذشته', description: 'ابزاری که از دل تیکت‌های حل‌شده‌ی گذشته، یک FAQ به‌روز بسازد.' },
  ],
  engineering: [
    { title: 'خلاصه‌ساز Code Review', description: 'ابزاری که تغییرات یک PR را خلاصه کند و نکات مهم review را برجسته کند.' },
    { title: 'تولیدکننده‌ی توضیحات PR', description: 'از روی diff، یک توضیح تمیز و ساختارمند برای Pull Request بنویسد.' },
  ],
  general: [
    { title: 'ابزار داخلی مبتنی بر AI', description: 'یک ابزار کوچک با Cursor، Claude Code یا Lovable که یک مسئله‌ی روزمره‌ی کارت را حل کند. می‌تواند ۲ ساعت کار باشد یا ۲ روز. غیر-proprietary، با لینک GitHub و دموی کوتاه.' },
    { title: 'دستیار جستجوی اسناد داخلی (RAG)', description: 'یک بات پرسش‌وپاسخ روی مجموعه‌ای از اسناد عمومی، ساخته‌شده با RAG.' },
  ],
};

// ── 3 auto-awarded badges (plan Week 8 Prompt 11) ──
const BADGES: { slug: string; name: string; description: string; criteria: Record<string, unknown> }[] = [
  { slug: 'first-project', name: 'اولین پروژه', description: 'اولین پروژه‌ی منتشرشده', criteria: { type: 'published_projects', gte: 1 } },
  { slug: 'spotlight-solver', name: 'Spotlight Solver', description: 'برنده‌ی یک هفته‌ی Spotlight', criteria: { type: 'spotlight_win' } },
  { slug: 'currently-building-streak', name: 'Currently Building Streak', description: 'کامیت در ۴ هفته‌ی متوالی', criteria: { type: 'commit_streak_weeks', gte: 4 } },
];

async function main() {
  console.log('[seed] starting…');

  // 1. Org
  await db
    .insert(orgs)
    .values({ name: 'سازمان اصلی', slug: MAIN_ORG_SLUG })
    .onConflictDoNothing();
  const [org] = await db.select().from(orgs).where(eq(orgs.slug, MAIN_ORG_SLUG));
  console.log(`[seed] org ready: ${org.slug} (${org.id})`);

  // 2. Admin user (placeholder until auth exists — update the email to a real one)
  await db
    .insert(users)
    .values({
      orgId: org.id,
      email: 'admin@aigraph.local',
      username: 'admin',
      name: 'مدیر سیستم',
      roleTitle: 'Platform Admin',
      status: 'active',
      isAdmin: true,
      onboardingChoice: 'hybrid',
      onboardingCompletedAt: new Date(),
    })
    .onConflictDoNothing();
  console.log('[seed] admin user ready');

  // 3. Skills taxonomy
  const skillRows = (Object.entries(SKILLS) as [SkillCat, string[]][]).flatMap(([category, names]) =>
    names.map((name) => ({ category, name, slug: slugify(name) })),
  );
  await db.insert(skills).values(skillRows).onConflictDoNothing();
  console.log(`[seed] skills: ${skillRows.length} upserted`);

  // 4. Domains
  await db.insert(domains).values(DOMAINS).onConflictDoNothing();
  console.log(`[seed] domains: ${DOMAINS.length} upserted`);

  // 5. Challenges (active — bypass review for seed)
  await db
    .insert(challenges)
    .values(CHALLENGES.map((c) => ({ ...c, orgId: org.id, status: 'active' as const })))
    .onConflictDoNothing({ target: [challenges.orgId, challenges.slug] });
  const challengeRows = await db.select().from(challenges).where(eq(challenges.orgId, org.id));
  const challengeIdBySlug = new Map(challengeRows.map((c) => [c.slug, c.id]));
  console.log(`[seed] challenges: ${challengeRows.length} present`);

  // 6. Starter Problems (only if none seeded yet — no natural unique key)
  const [existingProblem] = await db.select({ id: challengeProblems.id }).from(challengeProblems).limit(1);
  if (!existingProblem) {
    const problemRows = Object.entries(PROBLEMS).flatMap(([slug, list]) => {
      const challengeId = challengeIdBySlug.get(slug);
      if (!challengeId) return [];
      return list.map((p) => ({ ...p, challengeId, status: 'active' as const }));
    });
    await db.insert(challengeProblems).values(problemRows);
    console.log(`[seed] problems: ${problemRows.length} inserted`);
  } else {
    console.log('[seed] problems: already seeded, skipping');
  }

  // 7. Badges
  await db.insert(badges).values(BADGES).onConflictDoNothing();
  console.log(`[seed] badges: ${BADGES.length} upserted`);

  console.log('[seed] done ✅');
  process.exit(0);
}

main().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
