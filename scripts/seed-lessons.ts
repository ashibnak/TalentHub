/**
 * Lesson-of-the-day pool — idempotent. Run: `npm run db:seed:lessons`
 *
 * Curated external courses from Anthropic, OpenAI, IBM, Hugging Face, Google,
 * Microsoft, AWS, NVIDIA, DeepLearning.AI and others, rotated deterministically
 * on day-of-year (lib/lessons/rules.ts).
 *
 * ⚠️ URL POLICY — read before adding entries.
 * Every `url` here is a CATALOG, COURSE-HOME or DOCUMENTATION landing page, not
 * a deep link to an individual lesson. That is deliberate: provider catalogues
 * are reorganised constantly, and a deep link that 404s is worse than no link.
 * Landing pages survive reorganisation, and the learner lands somewhere they can
 * navigate from.
 *
 * These URLs were verified reachable with `npm run lessons:check` at seed time.
 * Re-run that check before each launch — this pool WILL rot, and nothing in the
 * app can detect a link that silently became a marketing page.
 *
 * Re-running updates a lesson in place (conflict on `slug`), so copy and URLs
 * can be corrected without wiping the table.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
config(); // .env fallback

import { sql } from 'drizzle-orm';
import { getDb } from '../lib/db';
import { lessons } from '../lib/db/schema';
import type { Lesson } from '../lib/lessons/rules';

const db = getDb();

type SeedLesson = Omit<Lesson, 'durationMinutes'> & { durationMinutes?: number | null };


const L = (l: SeedLesson): SeedLesson => l;

export const LESSON_POOL: SeedLesson[] = [
  /* ── Anthropic ─────────────────────────────────────────────────── */
  L({
    slug: 'anthropic-academy',
    kind: 'course',
    topics: ['claude-api', 'prompt-engineering', 'ai-agents'],
    provider: 'Anthropic',
    title: 'Anthropic Academy',
    description: 'مسیر رسمی یادگیری کار با Claude — از مفاهیم پایه تا ساخت اپلیکیشن. نقطه‌ی شروع خوبی برای هر دو پرسونا.',
    url: 'https://www.anthropic.com/learn',
    level: 'beginner',
    audience: 'all',
    durationMinutes: null,
  }),
  L({
    slug: 'anthropic-courses-repo',
    kind: 'course',
    topics: ['prompt-engineering', 'claude-api', 'python'],
    provider: 'Anthropic',
    title: 'Anthropic Courses (GitHub)',
    description: 'دوره‌های متن‌باز Anthropic به‌صورت نوت‌بوک؛ شامل مهندسی پرامپت و ارزیابی. برای یادگیری عملی با کد.',
    url: 'https://github.com/anthropics/courses',
    level: 'intermediate',
    audience: 'builder',
    durationMinutes: null,
  }),
  L({
    slug: 'anthropic-prompt-engineering',
    kind: 'doc',
    topics: ['prompt-engineering', 'claude-api'],
    provider: 'Anthropic',
    title: 'راهنمای مهندسی پرامپت Claude',
    description: 'مستند رسمی تکنیک‌های پرامپت‌نویسی: نقش‌دهی، مثال‌محوری، زنجیره‌ی فکر. مرجع کاربردی برای کار روزمره.',
    url: 'https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview',
    level: 'intermediate',
    audience: 'all',
    durationMinutes: 45,
  }),
  L({
    slug: 'anthropic-cookbook',
    kind: 'doc',
    topics: ['claude-api', 'rag', 'ai-agents', 'python'],
    provider: 'Anthropic',
    title: 'Anthropic Cookbook',
    description: 'نمونه‌کدهای آماده برای الگوهای رایج — استخراج داده، خلاصه‌سازی، فراخوانی ابزار.',
    url: 'https://github.com/anthropics/anthropic-cookbook',
    level: 'advanced',
    audience: 'builder',
    durationMinutes: null,
  }),

  /* ── OpenAI ────────────────────────────────────────────────────── */
  L({
    slug: 'openai-academy',
    kind: 'course',
    topics: ['prompt-engineering', 'chatgpt'],
    provider: 'OpenAI',
    title: 'OpenAI Academy',
    description: 'دوره‌های رایگان OpenAI برای سطوح مختلف، از کاربر عادی تا توسعه‌دهنده.',
    url: 'https://academy.openai.com/',
    level: 'beginner',
    audience: 'all',
    durationMinutes: null,
  }),
  L({
    slug: 'openai-prompt-guide',
    kind: 'doc',
    topics: ['prompt-engineering', 'chatgpt'],
    provider: 'OpenAI',
    title: 'راهنمای مهندسی پرامپت OpenAI',
    description: 'شش راهبرد رسمی برای گرفتن نتیجه‌ی بهتر از مدل‌ها، با مثال قبل و بعد.',
    url: 'https://platform.openai.com/docs/guides/prompt-engineering',
    level: 'intermediate',
    audience: 'all',
    durationMinutes: 40,
  }),
  L({
    slug: 'openai-cookbook',
    kind: 'doc',
    topics: ['rag', 'ai-agents', 'python', 'vector-databases'],
    provider: 'OpenAI',
    title: 'OpenAI Cookbook',
    description: 'مجموعه‌ی بزرگ نمونه‌های عملی؛ مرجع خوبی وقتی می‌دانی چه می‌خواهی ولی نه چطور.',
    url: 'https://cookbook.openai.com/',
    level: 'advanced',
    audience: 'builder',
    durationMinutes: null,
  }),

  /* ── IBM ───────────────────────────────────────────────────────── */
  L({
    slug: 'ibm-skillsbuild',
    kind: 'course',
    topics: ['machine-learning', 'hr', 'operations'],
    provider: 'IBM',
    title: 'IBM SkillsBuild',
    description: 'آموزش رایگان IBM با گواهی، شامل مسیرهای هوش مصنوعی برای افراد غیرفنی.',
    url: 'https://skillsbuild.org/',
    level: 'beginner',
    audience: 'domain_expert',
    durationMinutes: null,
  }),
  L({
    slug: 'ibm-cognitive-class',
    kind: 'course',
    topics: ['machine-learning', 'python', 'sql'],
    provider: 'IBM',
    title: 'IBM Cognitive Class',
    description: 'دوره‌های داده و AI با تمرین عملی و گواهی رایگان.',
    url: 'https://cognitiveclass.ai/',
    level: 'intermediate',
    audience: 'all',
    durationMinutes: null,
  }),

  /* ── Hugging Face ──────────────────────────────────────────────── */
  L({
    slug: 'hf-learn',
    kind: 'course',
    topics: ['transformers', 'hugging-face', 'nlp'],
    provider: 'Hugging Face',
    title: 'Hugging Face Learn',
    description: 'مرکز دوره‌های Hugging Face — NLP، ایجنت‌ها، بینایی ماشین و مدل‌های زبانی.',
    url: 'https://huggingface.co/learn',
    level: 'intermediate',
    audience: 'builder',
    durationMinutes: null,
  }),
  L({
    slug: 'hf-nlp-course',
    kind: 'course',
    topics: ['nlp', 'transformers', 'hugging-face', 'pytorch'],
    provider: 'Hugging Face',
    title: 'دوره‌ی NLP',
    description: 'از توکن‌سازی تا fine-tuning، با نوت‌بوک اجرایی در هر فصل. استاندارد عملی این حوزه.',
    url: 'https://huggingface.co/learn/nlp-course',
    level: 'advanced',
    audience: 'builder',
    durationMinutes: null,
  }),
  L({
    slug: 'hf-agents-course',
    kind: 'course',
    topics: ['ai-agents', 'langchain', 'hugging-face'],
    provider: 'Hugging Face',
    title: 'دوره‌ی ایجنت‌های AI',
    description: 'ساخت ایجنت‌هایی که ابزار صدا می‌زنند و چندمرحله‌ای تصمیم می‌گیرند.',
    url: 'https://huggingface.co/learn/agents-course',
    level: 'advanced',
    audience: 'builder',
    durationMinutes: null,
  }),

  /* ── Google ────────────────────────────────────────────────────── */
  L({
    slug: 'google-cloud-skills-boost',
    kind: 'course',
    topics: ['machine-learning', 'deep-learning'],
    provider: 'Google',
    title: 'Google Cloud Skills Boost',
    description: 'مسیرهای یادگیری هوش مصنوعی مولد گوگل با آزمایشگاه عملی.',
    url: 'https://www.cloudskillsboost.google/',
    level: 'intermediate',
    audience: 'all',
    durationMinutes: null,
  }),
  L({
    slug: 'kaggle-learn',
    kind: 'course',
    topics: ['python', 'machine-learning', 'sql', 'deep-learning'],
    provider: 'Kaggle',
    title: 'Kaggle Learn',
    description: 'میکرودوره‌های کوتاه و عملی؛ هرکدام چند ساعت، همه با نوت‌بوک آماده.',
    url: 'https://www.kaggle.com/learn',
    level: 'beginner',
    audience: 'builder',
    durationMinutes: 240,
  }),

  /* ── Microsoft ─────────────────────────────────────────────────── */
  L({
    slug: 'ms-learn-training',
    kind: 'course',
    topics: ['prompt-engineering', 'machine-learning'],
    provider: 'Microsoft',
    title: 'Microsoft Learn',
    description: 'مسیرهای آموزشی رایگان مایکروسافت، شامل Copilot و هوش مصنوعی مولد.',
    url: 'https://learn.microsoft.com/en-us/training/',
    level: 'beginner',
    audience: 'all',
    durationMinutes: null,
  }),
  L({
    slug: 'ms-generative-ai-beginners',
    kind: 'course',
    topics: ['prompt-engineering', 'rag', 'ai-agents'],
    provider: 'Microsoft',
    title: 'Generative AI for Beginners',
    description: 'دوره‌ی متن‌باز مایکروسافت در چند درس کوتاه؛ برای شروع از صفر مناسب است.',
    url: 'https://github.com/microsoft/generative-ai-for-beginners',
    level: 'beginner',
    audience: 'all',
    durationMinutes: null,
  }),
  L({
    slug: 'ms-ai-agents-beginners',
    kind: 'course',
    topics: ['ai-agents', 'langchain', 'prompt-engineering'],
    provider: 'Microsoft',
    title: 'AI Agents for Beginners',
    description: 'مبانی ساخت ایجنت با مثال‌های اجرایی، از الگوهای ساده تا چندایجنتی.',
    url: 'https://github.com/microsoft/ai-agents-for-beginners',
    level: 'intermediate',
    audience: 'builder',
    durationMinutes: null,
  }),

  /* ── DeepLearning.AI ───────────────────────────────────────────── */
  L({
    slug: 'dlai-short-courses',
    kind: 'course',
    topics: ['rag', 'langchain', 'ai-agents', 'vector-databases', 'prompt-engineering'],
    provider: 'DeepLearning.AI',
    title: 'دوره‌های کوتاه DeepLearning.AI',
    description: 'ده‌ها دوره‌ی یکی‌دو ساعته با همکاری سازندگان ابزارها؛ سریع‌ترین راه یادگیری یک موضوع مشخص.',
    url: 'https://www.deeplearning.ai/short-courses/',
    level: 'intermediate',
    audience: 'all',
    durationMinutes: 90,
  }),
  L({
    slug: 'dlai-ai-for-everyone',
    kind: 'course',
    topics: ['machine-learning', 'hr', 'finance', 'operations'],
    provider: 'DeepLearning.AI',
    title: 'AI for Everyone',
    description: 'دوره‌ی اندرو ان‌جی برای مخاطب غیرفنی: AI چه می‌تواند و چه نمی‌تواند، و چطور در سازمان به کار بیاید.',
    url: 'https://www.deeplearning.ai/courses/ai-for-everyone/',
    level: 'beginner',
    audience: 'domain_expert',
    durationMinutes: 360,
  }),

  /* ── AWS / NVIDIA ──────────────────────────────────────────────── */
  L({
    slug: 'aws-skill-builder',
    kind: 'course',
    topics: ['machine-learning', 'aws'],
    provider: 'AWS',
    title: 'AWS Skill Builder',
    description: 'مسیرهای یادگیری آمازون در حوزه‌ی هوش مصنوعی و یادگیری ماشین.',
    url: 'https://skillbuilder.aws/',
    level: 'intermediate',
    audience: 'builder',
    durationMinutes: null,
  }),
  L({
    slug: 'nvidia-dli',
    kind: 'course',
    topics: ['deep-learning', 'pytorch', 'computer-vision'],
    provider: 'NVIDIA',
    title: 'NVIDIA Deep Learning Institute',
    description: 'کارگاه‌های عملی یادگیری عمیق، بخشی رایگان و بخشی با گواهی.',
    url: 'https://www.nvidia.com/en-us/training/',
    level: 'advanced',
    audience: 'builder',
    durationMinutes: null,
  }),

  /* ── ابزارها و مراجع باز ───────────────────────────────────────── */
  L({
    slug: 'prompting-guide',
    kind: 'article',
    topics: ['prompt-engineering', 'rag', 'ai-agents'],
    provider: 'Prompt Engineering Guide',
    title: 'Prompt Engineering Guide',
    description: 'مرجع باز و جامع تکنیک‌های پرامپت با مقاله‌های مرجع هر روش.',
    url: 'https://www.promptingguide.ai/',
    level: 'intermediate',
    audience: 'all',
    durationMinutes: null,
  }),
  L({
    slug: 'elements-of-ai',
    kind: 'course',
    topics: ['machine-learning', 'hr', 'operations', 'marketing'],
    provider: 'University of Helsinki',
    title: 'Elements of AI',
    description: 'دوره‌ی مقدماتی مشهور و رایگان، بدون نیاز به برنامه‌نویسی. برای شروع کامل از صفر.',
    url: 'https://www.elementsofai.com/',
    level: 'beginner',
    audience: 'domain_expert',
    durationMinutes: 300,
  }),
  L({
    slug: 'cursor-docs',
    kind: 'doc',
    topics: ['cursor', 'prompt-engineering'],
    provider: 'Cursor',
    title: 'مستندات Cursor',
    description: 'راهنمای رسمی Cursor؛ مدیریت context، قواعد پروژه و حالت ایجنت.',
    url: 'https://docs.cursor.com/',
    level: 'intermediate',
    audience: 'builder',
    durationMinutes: null,
  }),
  L({
    slug: 'claude-code-docs',
    kind: 'doc',
    topics: ['claude-code', 'claude-api', 'prompt-engineering'],
    provider: 'Anthropic',
    title: 'مستندات Claude Code',
    description: 'راهنمای رسمی Claude Code — CLAUDE.md، اسکیل‌ها، هوک‌ها و جریان کار در ترمینال.',
    url: 'https://docs.anthropic.com/en/docs/claude-code/overview',
    level: 'intermediate',
    audience: 'builder',
    durationMinutes: null,
  }),
  L({
    slug: 'github-copilot',
    kind: 'doc',
    topics: ['github-copilot', 'github-actions'],
    provider: 'GitHub',
    title: 'GitHub Copilot',
    description: 'صفحه‌ی رسمی Copilot با راهنماها و نمونه‌های کاربرد در جریان کار روزمره.',
    url: 'https://github.com/features/copilot',
    level: 'beginner',
    audience: 'builder',
    durationMinutes: null,
  }),
  L({
    slug: 'langchain-academy',
    kind: 'course',
    topics: ['langchain', 'ai-agents', 'rag'],
    provider: 'LangChain',
    title: 'LangChain Academy',
    description: 'دوره‌های رسمی LangChain برای ساخت ایجنت و گراف‌های اجرایی.',
    url: 'https://academy.langchain.com/',
    level: 'advanced',
    audience: 'builder',
    durationMinutes: null,
  }),
  L({
    slug: 'xai-docs',
    kind: 'doc',
    topics: ['prompt-engineering'],
    provider: 'xAI',
    title: 'مستندات xAI',
    description: 'راهنمای رسمی API مدل‌های Grok برای توسعه‌دهنده‌ها.',
    url: 'https://docs.x.ai/',
    level: 'advanced',
    audience: 'builder',
    durationMinutes: null,
  }),
  L({
    slug: 'mistral-docs',
    kind: 'doc',
    topics: ['prompt-engineering', 'transformers'],
    provider: 'Mistral AI',
    title: 'مستندات Mistral',
    description: 'راهنمای مدل‌های Mistral، شامل نمونه‌های پرامپت و fine-tuning.',
    url: 'https://docs.mistral.ai/',
    level: 'advanced',
    audience: 'builder',
    durationMinutes: null,
  }),
  L({
    slug: 'openai-safety-best-practices',
    kind: 'article',
    topics: ['prompt-engineering', 'ai-agents'],
    provider: 'OpenAI',
    title: 'بهترین شیوه‌های ایمنی',
    description: 'راهنمای رسمی محدودیت‌ها و ریسک‌های استقرار مدل در محصول واقعی.',
    url: 'https://platform.openai.com/docs/guides/safety-best-practices',
    level: 'intermediate',
    audience: 'builder',
    durationMinutes: 30,
  }),
];

async function main() {
  const slugs = new Set(LESSON_POOL.map((l) => l.slug));
  if (slugs.size !== LESSON_POOL.length) throw new Error('duplicate lesson slug in the pool');

  await db
    .insert(lessons)
    .values(LESSON_POOL.map((l) => ({ ...l, durationMinutes: l.durationMinutes ?? null })))
    .onConflictDoUpdate({
      target: lessons.slug,
      set: {
        provider: sql.raw('excluded.provider'),
        title: sql.raw('excluded.title'),
        description: sql.raw('excluded.description'),
        url: sql.raw('excluded.url'),
        level: sql.raw('excluded.level'),
        kind: sql.raw('excluded.kind'),
        topics: sql.raw('excluded.topics'),
        audience: sql.raw('excluded.audience'),
        durationMinutes: sql.raw('excluded.duration_minutes'),
      },
    });

  const byProvider = LESSON_POOL.reduce<Record<string, number>>((acc, l) => {
    acc[l.provider] = (acc[l.provider] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`[seed:lessons] ${LESSON_POOL.length} lessons seeded`);
  console.log('[seed:lessons] providers:', byProvider);
  console.log('[seed:lessons] verify links with: npm run lessons:check');
  process.exit(0);
}

// Only seed when run directly — scripts/check-lesson-links.ts imports the pool.
if (process.argv[1]?.includes('seed-lessons')) {
  main().catch((err) => {
    console.error('[seed:lessons] failed:', err);
    process.exit(1);
  });
}
