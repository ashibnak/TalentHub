# AI Talent Graph of Iran — Project Plan & Architecture

**Version: v0.7** · phase 1 (internal launch) — pre-build

## Changelog

- **v0.7** (current) — تصمیم نهایی `LLM Provider` مستند شد: `AvalAI` با مدل `gpt-4o`، بعد از تست موفق روی ۳ `repo` واقعی (نرخ موفقیت ۳/۳، `latency` ~۴.۹ ثانیه، تشخیص صحیح `claim` غلط). دیگه نیازی به `plan B` برای فاز ۱ نیست.
- **v0.6** — Persona-aware onboarding flow: 5-step wizard با branching بر اساس identity choice (Builder/DE/Hybrid)، schema جدید روی `users` (`onboarding_choice`, `onboarding_completed_at`, `onboarding_confidence`)، `persona_hint` روی invitations برای template ایمیل، سه template ایمیل جداگانه، landing متفاوت بعد از onboarding بر اساس persona، middleware enforcing wizard completion
- **v0.5** — Domain Expert persona اضافه شد: schema جدید `domains` و `user_domain_expertise`، logic `role_badge` (Builder/Domain Expert/Hybrid)، section "Domain Experts" روی Challenge detail page، endorsement-based verification موکول به فاز ۲
- **v0.4** — Challenge بازطراحی شد به‌عنوان persistent domain buckets با sub-entity `ChallengeProblem`. community-proposed با admin approval. Spotlight به‌عنوان لایه‌ی هفتگی روی buckets ماندگار. (تغییر ساختاری بزرگ)
- **v0.3** — Trim کردن scope MVP: حذف MinIO، BullMQ، Sentry، notification bell پیچیده، `/app/feed` page، audit logs پیچیده. اضافه کردن Weekly Challenge Loop به‌عنوان موتور engagement اولیه (جایگزین شد در v0.4)
- **v0.2** — Build-in-Public Activity Stream اضافه شد (GitHub polling، `building_status` pill، last_activity_at). فیلد `stage` رو پروژه‌ها اضافه شد (Experiment / Weekend Hack / Building / Shipped / Maintained)
- **v0.1** — برنامه‌ی اولیه‌ی ۸ هفته‌ای با stack، schema، AI Skill Verification ساده، و پرامپت‌های Claude Code

---

## بخش ۱ — اصول راهنما

این پلن بر پایه‌ی چهار اصل بنا شده:

**۱. Spec قبل از Code.** هر feature قبل از اینکه به Claude Code داده بشه، باید یه spec کوتاه (نیم تا یک صفحه) داشته باشه که شامل: هدف، user story، data model، UI flow، edge case ها. این spec توسط انسان نوشته میشه، نه AI.

**۲. یک feature در هر sprint کوچک.** هر prompt به Claude Code باید scope محدود داشته باشه. اشتباه رایج: "کل اپ رو بساز." اشتباه‌تر: "همه‌ی feature های auth و profile رو با هم بساز." درست: "فقط invite token system رو بساز، با تست."

**۳. Commit و Review بعد از هر prompt.** بعد از هر prompt موفق Claude Code، کد رو read کن (نه فقط run)، یه commit بزن. اگه prompt بعدی شکست خورد، می‌تونی برگردی. این discipline تو ۸ هفته صرفه‌جویی روزها می‌کنه.

**۴. Schema-ready for multi-tenancy، Feature-free.** همه‌ی جدول‌ها از روز اول `org_id` دارن و همه‌ی query ها scoped به یه `org_id` ثابت ('main-org') می‌نویسن. ولی **هیچ feature** برای org-switching، org-creation، یا UI مولتی‌تننسی نمی‌سازیم. این یعنی فاز پابلیک با یه refactor خیلی کم می‌تونه multi-tenant بشه، بدون migration دردناک.

---

## بخش ۲ — معماری

### Stack پیشنهادی

این stack برای AI-native development بهینه شده — Claude Code با این ابزارها خوب کار می‌کنه چون پترن‌هاش رو خوب می‌شناسه.

**Frontend & Backend (Monolith)**
- `Next.js 15` با App Router
- `TypeScript` (strict mode)
- `Tailwind CSS` + `shadcn/ui` برای کامپوننت‌ها
- `React Hook Form` + `Zod` برای فرم‌ها و validation
- `TanStack Query` برای data fetching

**Database & ORM**
- `PostgreSQL 16`
- `Drizzle ORM` (سبک‌تر و AI-friendly تر از Prisma)
- `Drizzle Kit` برای migration ها

**Auth**
- `Better Auth` (یا `Auth.js v5` به‌عنوان جایگزین)
- Magic link از طریق SMTP سازمان
- Session با cookie

**Storage**
- فاز ۱: بدون MinIO. آواتار = initials روی پس‌زمینه‌ی رنگی (تولیدی، library مثل `dicebear`). cover image پروژه و اسکرین‌شات = optional URL field (کاربر خودش imgur/cloudinary می‌ذاره)
- فاز ۲: MinIO یا S3-compatible سازمانی اضافه میشه

**Background Jobs**
- فاز ۱: یه cron job ساده (`node-cron` داخل process یا یه container جدا) برای verification و GitHub polling. هر دو async ولی sequential، نه queue.
- فاز ۲ (وقتی volume بالا رفت): BullMQ + Redis

**AI Layer**
- یه `ai-gateway` ساده که abstraction روی LLM provider بده
- فاز ۱: provider ایرانی (آوالای، گیلاس‌نت و...)
- فاز ۲: self-hosted `Qwen 2.5 Coder` با `Ollama` برای privacy

**Deployment**
- Docker Compose برای فاز ۱
- یه VM داخل کلود سازمان با `nginx` reverse proxy
- backup روزانه‌ی postgres
- structured logging به stdout (مثل `pino`)، بدون Sentry در فاز ۱. اگه فاز ۲ نیاز شد، Sentry self-hosted اضافه می‌شه.

### نمودار معماری

```
┌─────────────────────────────────────────┐
│         Browser (User / Admin)          │
└─────────────────┬───────────────────────┘
                  │ HTTPS
                  ▼
┌─────────────────────────────────────────┐
│           nginx (reverse proxy)         │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│          Next.js App (Docker)           │
│  ┌──────────────────────────────────┐   │
│  │  Server Components / API Routes  │   │
│  │  Auth (Better Auth)              │   │
│  │  AI Gateway                      │   │
│  │  Cron Jobs (verification, polling)│  │
│  └──────────────────────────────────┘   │
└──────────────────┬──────────────────────┘
                   │
                   ▼
              PostgreSQL
              (Drizzle)
                   │
                   ▼ (verification calls)
          External LLM Provider
          (Iran proxy or local Qwen)
```

**نکته**: فاز ۱ یه monolith ساده‌ست. هیچ MinIO، Redis، یا worker جدایی نداریم. Postgres همه چی رو نگه می‌داره. این تصمیم باعث می‌شه deploy و debug ساده باشه. وقتی volume بالا رفت، component ها جدا می‌شن.

### Database Schema (نسخه‌ی فاز ۱)

این schema از روز اول برای multi-tenancy آماده‌ست (هر جدول `org_id` داره)، ولی فاز ۱ فقط یه org داره.

```typescript
// orgs - سازمان‌ها (آماده برای فاز پابلیک)
orgs {
  id: uuid (PK)
  name: string
  slug: string (unique)
  settings: jsonb
  created_at: timestamp
}

// users - کاربران
users {
  id: uuid (PK)
  org_id: uuid (FK -> orgs)
  email: string (unique)
  name: string
  role_title: string  // مثل "Senior Backend Developer"
  bio: text
  avatar_url: string?
  github_username: string?
  linkedin_url: string?
  status: enum('invited', 'active', 'inactive')
  is_admin: boolean
  onboarding_choice: enum('builder', 'domain_expert', 'hybrid')?  // self-identified at sign-up
  onboarding_completed_at: timestamp?  // null = still in wizard
  onboarding_confidence: enum('high', 'medium', 'low', 'unknown')?  // last question of wizard
  created_at: timestamp
  last_active_at: timestamp
}

// skills - taxonomy ثابت (یه seed file داره)
skills {
  id: uuid (PK)
  category: enum('language', 'framework', 'tool', 'concept', 'ai_tool')
  name: string
  slug: string (unique)
  description: text?
}

// user_skills - اسکیل ادعا شده توسط کاربر
user_skills {
  user_id: uuid (FK)
  skill_id: uuid (FK)
  claimed_level: int (1-5)
  verified: boolean (default false)
  verification_source: enum('ai_repo_analysis', 'manual')?
  verified_at: timestamp?
  PK: (user_id, skill_id)
}

// domains - تاکسونومی دامنه‌های تخصصی (seed file)
// جداست از skills چون category متفاوتی از expertise رو نشون می‌ده
// این برای persona دوم محصول: Domain Expert (مثل HR partner، finance analyst)
domains {
  id: uuid (PK)
  slug: string (unique)  // 'hr', 'finance', 'marketing', 'legal', 'operations', 'sales', 'customer_success', 'product', 'healthcare', 'education', 'other'
  name: string  // 'منابع انسانی · Human Resources', etc.
  description: text?
}

// user_domain_expertise - دامنه‌های تخصصی ادعا شده توسط کاربر
user_domain_expertise {
  user_id: uuid (FK)
  domain_id: uuid (FK)
  years_experience: int?  // optional، self-reported
  notes: text?  // optional، حداکثر ۲۰۰ کاراکتر
  PK: (user_id, domain_id)
}
// نکته: `role_badge` کاربر یه فیلد محاسبه‌شده‌ست (نه ذخیره‌شده):
//   - 'domain_expert': user_domain_expertise داره ولی کم/هیچ user_skills (technical)
//   - 'builder': user_skills technical داره ولی domain expertise نداره
//   - 'hybrid': هر دو
// تو UI به‌صورت یه badge subtle کنار اسم نشون داده می‌شه. رقابتی نیست، identity ست.

// projects - پروژه‌های کاربران
projects {
  id: uuid (PK)
  user_id: uuid (FK)
  title: string
  description: text
  github_url: string?
  demo_url: string?
  cover_image_url: string?
  is_personal_project_confirmed: boolean  // disclaimer مالکیت
  status: enum('draft', 'published')
  stage: enum('experiment', 'weekend_hack', 'building', 'shipped', 'maintained')
  upvote_count: int (default 0)  // denormalized
  github_metadata: jsonb?  // stars, language, last_commit
  last_activity_at: timestamp?  // آخرین commit از GitHub
  created_at: timestamp
  updated_at: timestamp
}

// project_skills - skill های استفاده‌شده تو پروژه
project_skills {
  project_id: uuid (FK)
  skill_id: uuid (FK)
  PK: (project_id, skill_id)
}

// project_ai_tools - ابزارهای AI استفاده‌شده
project_ai_tools {
  project_id: uuid (FK)
  tool_slug: string  // 'cursor', 'claude-code', 'lovable', 'v0', 'bolt'
  PK: (project_id, tool_slug)
}

// verification_runs - نتایج AI verification
verification_runs {
  id: uuid (PK)
  user_id: uuid (FK)
  project_id: uuid (FK)
  llm_provider: string
  llm_model: string
  input_summary: text  // README + metadata که فرستادیم
  output: jsonb  // {skill_slug: {confidence, evidence}}
  status: enum('pending', 'success', 'failed')
  error_message: text?
  created_at: timestamp
  completed_at: timestamp?
}

// project_activity - فعالیت زنده از GitHub (build-in-public)
project_activity {
  id: uuid (PK)
  project_id: uuid (FK)
  event_type: enum('commit', 'release', 'star_milestone', 'fork_milestone')
  payload: jsonb  // detail های event (sha, message، tag، count و...)
  occurred_at: timestamp
  fetched_at: timestamp
}
// نکته: `building_status` کاربر یه فیلد محاسبه‌شده‌ست (نه ذخیره‌شده):
//   - 'currently_building' اگه commit در ۷ روز اخیر
//   - 'shipped' اگه release داره ولی commit در ۳۰ روز اخیر نیست
//   - 'idle' در باقی موارد
// این رو می‌تونی یا تو query محاسبه کنی یا یه materialized view بسازی.

// badges - تعریف badge ها
badges {
  id: uuid (PK)
  slug: string (unique)
  name: string
  description: text
  icon_url: string
  criteria: jsonb  // برای auto-award
}

// user_badges
user_badges {
  user_id: uuid (FK)
  badge_id: uuid (FK)
  awarded_at: timestamp
  PK: (user_id, badge_id)
}

// invitations
invitations {
  id: uuid (PK)
  org_id: uuid (FK)
  email: string
  token: string (unique)
  invited_by: uuid (FK -> users)
  persona_hint: enum('builder', 'domain_expert', 'hybrid', 'unknown') (default 'unknown')  // برای template ایمیل
  status: enum('pending', 'accepted', 'expired')
  expires_at: timestamp
  created_at: timestamp
}

// audit_logs - فقط رویدادهای حساس (مینیمال)
// مهم‌ترین کاربردش: اثبات اینکه کاربر disclaimer مالکیت رو قبول کرده
audit_logs {
  id: uuid (PK)
  user_id: uuid?
  action: string  // فقط: 'disclaimer.accepted', 'user.status_changed', 'project.published'
  metadata: jsonb
  ip_address: string?
  created_at: timestamp
}

// challenges - دسته‌های دامنه‌ای (HR، Finance، CS، Engineering، ...)
// community پیشنهاد می‌ده، admin تأیید می‌کنه
challenges {
  id: uuid (PK)
  org_id: uuid (FK)  // schema-ready برای multi-tenant، ولی فاز ۱ همه main-org هستن
  slug: string  // 'hr', 'finance', 'customer-support'
  title: string
  description: text  // شرح این dimain و چه نوع مشکلاتی توش هست
  sponsor_team: string?  // متن، مثلاً "HR Business Partners"
  proposed_by: uuid (FK -> users)
  status: enum('pending_review', 'active', 'archived', 'rejected')
  reviewed_by: uuid? (FK -> users)
  reviewed_at: timestamp?
  rejection_reason: text?
  created_at: timestamp
}

// challenge_problems - مشکلات مشخص داخل هر Challenge
// community پیشنهاد می‌ده، admin تأیید می‌کنه
challenge_problems {
  id: uuid (PK)
  challenge_id: uuid (FK)
  title: string  // مثلاً "Automated recruitment screening tool"
  description: text  // توضیح، context، معیار موفقیت
  proposed_by: uuid (FK -> users)
  status: enum('pending_review', 'active', 'resolved', 'archived', 'rejected')
  reviewed_by: uuid? (FK -> users)
  reviewed_at: timestamp?
  rejection_reason: text?
  is_spotlight: boolean (default false)  // فقط یکی در هر زمان معمولاً
  spotlight_starts_at: timestamp?
  spotlight_ends_at: timestamp?
  spotlight_winner_project_id: uuid? (FK -> projects)  // بعد از پایان spotlight
  created_at: timestamp
}

// project_challenge_problems - link table: یه پروژه می‌تونه به چند Problem وصل بشه
project_challenge_problems {
  project_id: uuid (FK)
  challenge_problem_id: uuid (FK)
  submission_notes: text?  // چرا این پروژه به این Problem می‌خوره
  created_at: timestamp
  PK: (project_id, challenge_problem_id)
}

// project_upvotes - upvote روی خود پروژه (نه context-specific)
project_upvotes {
  user_id: uuid (FK)
  project_id: uuid (FK)
  created_at: timestamp
  PK: (user_id, project_id)
}
// نکته: roi projects باید یه فیلد denormalized `upvote_count` اضافه بشه برای performance.
```

---

## بخش ۳ — طراحی `AI Skill Verification` (نسخه‌ی ساده)

این feature تو فاز ۱ به ساده‌ترین شکل ممکن. هدف: اعتماد ابتدایی، نه perfection.

### ۳.۰ — تصمیم نهایی `LLM Provider` (تست‌شده و تأیید شده)

**`Provider` انتخابی: `AvalAI` با مدل `gpt-4o`**

قبل از ورود این `feature` به `sprint` (هفته‌ی ۷)، یه `test script` مستقل نوشته شد که `prompt verification` رو روی ۳ `repo` واقعی از `GitHub` اجرا کرد (یکی از `repo` ها عمداً یه `skill` غلط `claim` شده داشت، برای تست دقت مدل). نتیجه:

| معیار | نتیجه | آستانه‌ی پذیرش | وضعیت |
|---|---|---|---|
| نرخ موفقیت (`JSON` معتبر) | ۳ از ۳ | همه باید معتبر باشن | ✅ قبول |
| میانگین `latency` | ~۴.۹ ثانیه | زیر ۱۰ ثانیه | ✅ قبول |
| رد کردن `claim` غلط | تشخیص داده شد (`confidence: 0.00`) | باید رد بشه | ✅ قبول |

این یعنی نیازی به `plan B` (مدل `local` مثل `Qwen`، یا `provider` دوم) برای فاز ۱ نیست. این `benchmark` باید **قبل از هفته‌ی ۷** یه‌بار دیگه با ۱۰-۱۵ `repo` واقعی از خود کارمندها تکرار بشه، چون `repo` های عمومی `GitHub` معمولاً `README` تمیزتری از `weekend hack` های داخلی دارن.

`Budget alert` روی حساب `AvalAI` باید تنظیم بشه قبل از `launch`، چون با ۵۰ نفر کاربر فعال، تعداد `request` ها به‌طور محسوسی بالا می‌ره.

### جریان کار

```
کاربر پروژه ثبت می‌کنه با لینک GitHub
       │
       ▼
کاربر skill ها رو از taxonomy انتخاب می‌کنه و به پروژه می‌چسبونه
       │
       ▼
[Background Job شروع میشه]
       │
       ▼
1. GitHub API رو می‌زنه و این رو می‌کشه:
   - README content
   - languages breakdown
   - top-level file structure (تا ۲۰ فایل)
   - last 10 commit messages
   - stars, forks, last_commit_date
       │
       ▼
2. Prompt به LLM می‌فرسته
       │
       ▼
3. LLM یه JSON بر می‌گردونه با confidence برای هر skill
       │
       ▼
4. برای skill هایی که confidence > 0.7 → verified = true
   بقیه → claimed (verified = false)
       │
       ▼
5. نتیجه روی پروفایل نشون داده میشه:
   - skill verified: نشان سبز کنار اسم skill
   - skill claimed: بدون نشان
6. کاربر می‌تونه دلیل verification رو ببینه (transparency)
```

### Prompt اصلی برای Skill Verification

این prompt رو می‌تونی مستقیم استفاده کنی (به انگلیسی نگه دارش، چون LLM ها انگلیسی بهتر JSON می‌سازن):

```
You are a skill verification system for an AI talent platform.

You will receive a GitHub repository's metadata and a list of skills the developer claims they used in this project. Your job: analyze whether the evidence in the repository supports each claim.

Repository metadata:
- Name: {repo_name}
- Description: {repo_description}
- Primary languages: {languages}
- Star count: {stars}
- README (first 3000 chars):
{readme_content}
- File structure (top 20 files):
{file_list}
- Recent commit messages (last 10):
{commit_messages}

Developer's claimed skills for this project:
{claimed_skills_with_slugs}

For each claimed skill, return a verdict. Be STRICT — only verify if there is direct, visible evidence in the README, file structure, languages, or commits. Do NOT verify based on assumption or inference from project type alone.

Output STRICT JSON with this exact shape:
{
  "verifications": [
    {
      "skill_slug": "string (must match input slug exactly)",
      "confidence": 0.0,
      "evidence": "1-2 sentence explanation citing specific files/text from the repo",
      "verdict": "verified" | "insufficient"
    }
  ],
  "summary": "1 sentence overall assessment of project quality and skill alignment"
}

Rules:
- confidence >= 0.7 → verdict: "verified"
- confidence < 0.7 → verdict: "insufficient"
- If a claimed skill has zero evidence, set confidence to 0.0 and explain
- If the README is missing or empty, lower all confidence by 0.2
- Do NOT add skills the developer didn't claim
- Output ONLY valid JSON, no markdown fences, no preamble
```

### نکات پیاده‌سازی

- این prompt باید با Claude Sonnet یا GPT-4 سطح استفاده بشه. مدل‌های کوچک‌تر JSON رو خراب می‌کنن.
- output رو با `Zod` schema validate کن. اگه valid نبود، retry با temperature پایین‌تر.
- cache نتایج verification رو بر اساس `(repo_url, last_commit_sha)`. اگه repo تغییر نکرده، دوباره API call نزن.
- یه `failsafe` بذار: اگه verification ۳ بار failed شد، skill رو "claimed" نگه دار و یه log بزن.
- در فاز ۱، فقط روی پروژه‌هایی verification رو فعال کن که `github_url` دارن. پروژه‌های بدون لینک، همه skill هاشون "claimed" می‌مونن.

---

## بخش ۳.۵ — طراحی Challenge (موتور engagement)

این feature هسته‌ی فعالیت پلتفرمه. مدل اصلی **domain-based persistent buckets** هست، با یه چرخه‌ی هفتگی به‌عنوان لایه‌ی روی اون.

### مدل entity

سه سطح:

**۱. Challenge** — bucket دامنه‌ای (مثل `HR`، `Finance`، `Customer Support`، `Engineering`). توسط community پیشنهاد می‌شه، توسط admin تأیید. ماندگار. هر Challenge یه `sponsor_team` متنی داره (مثلاً "HR Business Partners") که نشون می‌ده کدوم بخش سازمان ازش بیشتر بهره‌مند می‌شه.

**۲. ChallengeProblem** — مشکل مشخص داخل یه Challenge. توسط community پیشنهاد، توسط admin تأیید. ماندگار تا وقتی resolved یا archived بشه. مثلاً داخل `HR Challenge`:
- "Automated CV screening tool"
- "Onboarding checklist bot"
- "Internal mobility recommendation system"

**۳. Project** — پروژه‌ی کاربر. می‌تونه به صفر، یک، یا چند `ChallengeProblem` وصل بشه (link table). یه پروژه می‌تونه بدون Challenge وجود داشته باشه (پروژه‌ی شخصی محض).

### چرا این مدل بهتر از weekly competition قدیمه

- **Persistent value**: پروژه‌ها روی Challenge ها انباشت می‌شن. هر Problem تبدیل می‌شه به یه galleria از راه‌حل‌ها در طول زمان.
- **Match-making واقعی**: تیم HR می‌بینه کی واقعاً مشکل HR رو حل کرده، نه یه چالش جنریک.
- **با قاعده‌ی IP non-proprietary سازگار**: Problem ها general-purpose ان (مفهومی)، نه proprietary خاص یه محصول. تیم امنیت کاری نداره.
- **Community-driven**: هر کسی پیشنهاد بده. admin فقط quality gate هست.
- **Stepping stone به Intrapreneurship Lane**: ماه ۴-۵ می‌تونی sponsorship رسمی اضافه کنی (تیم HR پاداش بذاره برای حل Problem خاص).

### چرخه‌ی هفتگی Spotlight (لایه‌ی engagement)

مدل persistent خودش engagement هفتگی نمی‌سازه. این لایه‌ی Spotlight اینو حل می‌کنه:

```
شنبه ساعت ۱۰ ← admin یه ChallengeProblem رو spotlight می‌کنه
       │       (is_spotlight=true، spotlight_starts_at=now، +7 days)
       ▼
ایمیل + بنر روی home page به همه می‌ره
       │
شنبه تا جمعه ← اعضا روی این Problem کار می‌کنن، پروژه submit می‌کنن
       │              (activity stream می‌درخشه)
       ▼
شنبه‌ی بعدی ← spotlight تموم می‌شه، admin برنده رو انتخاب می‌کنه
       │       پروژه‌ی برنده badge "Spotlight Solver" می‌گیره
       ▼
ChallengeProblem به pool معمولی برمی‌گرده، submission ها می‌مونن
       │
       ▼
admin یه Problem جدید spotlight می‌کنه
```

**نکته**: spotlight هیچ Problem جدیدی نمی‌سازه — فقط یکی از موجودها رو بالا میاره. این یعنی admin هیچ‌وقت content tap خشک نمیاره چون Problem ها به‌صورت community-driven پیشنهاد می‌شن.

### سه engagement layer که با هم کار می‌کنن

علاوه بر چرخه‌ی Spotlight، این سه مکانیزم passive engagement رو نگه می‌دارن:

**۱. Spotlight Banner** (چرخه‌ی هفتگی) — توضیحش بالا.

**۲. Activity-driven Surfacing** — تو directory Challenge ها، هرکدوم که submission تازه گرفته یا upvote جدید داره، بالاتر نمایش داده می‌شه. این به‌صورت خودکار "زنده" نشون می‌ده کدوم Challenge ها active ان.

**۳. Sponsor Announcement** — وقتی admin یه ChallengeProblem جدید رو approve می‌کنه (یا یه Problem موجود رو spotlight می‌کنه)، یه ایمیل خلاصه می‌ره به همه‌ی اعضایی که "Follow" کردن اون Challenge رو. follow ساده‌ست: یه دکمه روی صفحه‌ی Challenge. فاز ۱ فقط ایمیل، notification داخل اپ نه.

### قواعد طراحی Challenge و Problem

- **scope Problem کوچیک**: قابل انجام در ۲ تا ۲۰ ساعت کار. اگه بزرگ‌تر باشه، باید split بشه به sub-problem های کوچیک‌تر (admin می‌تونه پیشنهاددهنده رو هدایت کنه).
- **general-purpose**: هیچ Problem نباید به محصول خاص سازمان رفرنس بده. این قاعده‌ی IP رو حفظ می‌کنه.
- **AI-tool-positive**: Problem باید با ابزار AI انجام‌شدنی باشه (نه الزاماً مجبور).
- **معیار "حل شدن" روشن**: هر Problem باید توضیح بده "چی به‌حساب می‌آد به‌عنوان راه‌حل خوب." این هم به سازنده‌ها کمک می‌کنه هم به admin برای انتخاب spotlight winner.

### جریان admin approval

برای هر Challenge یا Problem پیشنهادشده:
1. status = `pending_review` (پیش‌فرض)
2. ایمیل به admin می‌ره: "X کاربر یه Challenge/Problem جدید پیشنهاد داد"
3. admin توی `/app/admin/challenge-queue` می‌بینه، می‌خونه
4. تأیید → status = `active`، ایمیل به پیشنهاددهنده می‌ره ("پذیرفته شد")
5. رد → status = `rejected` با `rejection_reason`، ایمیل به پیشنهاددهنده ("نه به این دلیل")

این flow ساده‌ست ولی critical — حتماً response time admin زیر ۴۸ ساعت باشه، وگرنه community ول می‌کنه.

### Challenge های اولیه برای seed (روز launch)

پیشنهاد: **۴-۵ Challenge اولیه خودت seed کن**، community فقط Problem های داخلشون رو پیشنهاد می‌ده. Challenge جدید فقط اگه واقعاً domain جدیدی پیدا شد. این از فعال شدن آنی pool جلوگیری می‌کنه و quality گیت می‌سازه.

Challenge های پیشنهادی روز اول:
- **HR Challenge** — مشکلات حوزه‌ی منابع انسانی
- **Finance Challenge** — مشکلات حوزه‌ی مالی و حسابداری
- **Customer Support Challenge** — مشکلات پشتیبانی مشتری
- **Engineering Challenge** — مشکلات internal tooling و developer productivity
- **General** — برای مشکلاتی که جای دیگه‌ای نمی‌خورن

### چند ChallengeProblem نمونه برای seed

برای اینکه روز اول pool خالی نباشه، خودت ۸-۱۰ Problem از قبل اضافه کن:

**HR**: CV screening، onboarding bot، performance review summarizer، internal mobility matcher

**Finance**: expense report categorizer، vendor analysis tool، budget forecast assistant

**Customer Support**: ticket classifier، FAQ generator from past tickets، response draft assistant

**Engineering**: code review summarizer، PR description generator، doc-from-code tool

### Domain Experts روی صفحه‌ی Challenge

محصول از روز اول دو persona داره: **Builder** (developer که با AI کار می‌کنه) و **Domain Expert** (متخصص حوزه که از AI tooling استفاده می‌کنه ولی technical نیست). برای اینکه Domain Expert ها feel marginal نکنن، هر Challenge page یه section ساده داره: **"Domain Experts in this area"**.

منطقش:
- query کاربرهایی که `user_domain_expertise.domain.slug = challenge.slug`
- نمایش top 8 به‌صورت یه grid کوچیک از user card ها (avatar + name + years_experience اگه پر شده)
- ترتیب: بر اساس years_experience desc، بعد بر اساس last_active_at

این matchmaking طبیعی می‌سازه بدون نیاز به feature های پیچیده:
- یه Builder که می‌خواد HR tool بسازه، می‌بینه کی تو سازمان HR expert ست
- Domain Expert ها visibility می‌گیرن بدون اینکه نیاز باشه پروژه‌ی technical داشته باشن
- در فاز ۲، یه CTA "ask for domain advice" روی پروژه‌ها می‌تونه DE های مرتبط رو notify کنه

**Domain → Challenge mapping** ساده‌ست: فیلد `domains.slug` مستقیماً با `challenges.slug` match می‌شه. Domain `hr` → Challenge `hr`. این از روز اول consistent نگه‌ش دار.

**ارزیابی domain expertise در فاز ۱: نه.** برخلاف skill verification (که با LLM روی GitHub repo قابل انجامه)، ارزیابی domain expertise بسیار دشواره: چطور بفهمیم HR business partner واقعاً ۱۰ سال HR کرده یا ۲ سال؟ false positive هزینه‌ی اعتباری بالایی داره. در فاز ۲ به‌جای ارزیابی الگوریتمی، **endorsement از Builder ها** اضافه می‌شه: کاربر می‌تونه روی پروفایل یه Domain Expert بگه "این آدم تو پروژه‌ی من به‌عنوان HR expert مشاوره داد و واقعاً مفید بود."

---


## بخش ۴ — روادمپ ۸ هفته‌ای

هر هفته یه میلستون داره با deliverable مشخص. هر deliverable یه prompt strategy داره.

### هفته ۱ — Foundation & Decisions

**Deliverable:** تصمیم‌های زیرساختی نهایی + مخزن کد setup شده + landing page ساده

**کارها:**
- تصمیم نهایی روی LLM provider (آوالای، گیلاس‌نت یا...). یه trial account بگیر و یه call تست بزن.
- VM داخلی setup. docker، docker-compose، nginx آماده.
- repo اولیه: `next-app` با TypeScript، Tailwind، shadcn/ui، Drizzle.
- Connect به Postgres داخلی.
- یه landing page ساده با waitlist (بدون database، فقط فرم به email).
- تصمیم branding: اسم نهایی، لوگو (یک ساعت در Figma)، palette.

**Claude Code Prompts این هفته:**

> Prompt 1: "Initialize a Next.js 15 project with App Router, TypeScript strict mode, Tailwind CSS v4, and shadcn/ui. Set up Drizzle ORM with a PostgreSQL connection (env-based). Configure ESLint and Prettier. Create the folder structure: /app, /components/ui, /lib/db, /lib/auth. Do not create any features yet — just the scaffold."

> Prompt 2: "Create a simple landing page at /app/page.tsx with: hero section with title '{اسم محصول}' and tagline, a waitlist email form that posts to /api/waitlist, and a footer. Use shadcn/ui components. The form should validate email with Zod and show success/error states. The API route should log the email to console for now (no database)."

**انسان review:** آیا scaffold شامل چیز اضافه‌ای هست؟ آیا dependency های پیش‌بینی‌نشده اضافه شدن؟ هرچی غیرضروریه delete کن.

### هفته ۲ — Auth & Invite System + Onboarding Wizard

**Deliverable:** کاربر می‌تونه با invite token وارد بشه، و از طریق onboarding wizard مسیر متناسب با persona خودش رو طی کنه

**Spec کوتاه:**
- ادمین تو CLI/script یه invite می‌سازه با persona_hint (`pnpm invite new email@example.com --persona=domain_expert`)
- ایمیل magic link از یکی از سه template (Builder/DE/Hybrid) به کاربر می‌ره
- کاربر روی link کلیک می‌کنه → session ساخته میشه
- اگه اولین بار وارد میشه → 5-step onboarding wizard
- بعد از wizard → بر اساس انتخابش به صفحه‌ی مناسب redirect می‌شه (Builder → /projects/new، DE → /challenges?filter=domain، Hybrid → choice)
- middleware: اگه `onboarding_completed_at` null باشه و کاربر تو route دیگه‌ای باشه، به /onboarding redirect می‌شه

**Claude Code Prompts:**

> Prompt 1: "Add the database schema for `users`, `orgs`, and `invitations` tables using Drizzle. Use the schema definitions from {path-to-schema-doc} — include the new onboarding fields on users (`onboarding_choice`, `onboarding_completed_at`, `onboarding_confidence`) and `persona_hint` on invitations. Create migration files. Add a seed script that creates one default org named 'فناپ' (or {your-org-name}) with slug 'main-org'."

> Prompt 2: "Implement invitation system: (1) A CLI script at /scripts/create-invite.ts that takes args `--email`, `--persona` (default 'unknown'). Generates token, saves to invitations with persona_hint, prints a link. (2) An API route /api/invitations/[token] that validates and consumes the token, creating a user. The created user's `onboarding_choice` is null initially (set later in wizard); but the invitation's persona_hint is read to choose email template. (3) An email-sending utility using nodemailer with SMTP config from env vars."

> Prompt 3: "Create three persona-aware invite email templates at /lib/email/templates/invite-{builder,domain_expert,hybrid,unknown}.ts. Each ~150 words Persian. Differences: **Builder template** mentions GitHub, AI tools (Cursor، Claude Code)، shipping projects. **Domain Expert template** explicitly says 'نیاز نیست کد بنویسی' and positions them as advisors who can share domain expertise. **Hybrid template** mentions both paths. **Unknown** is generic but warm. CLI script picks template based on invitations.persona_hint."

> Prompt 4: "Install Better Auth and configure it with magic-link email provider. Wire it to use the SMTP utility. After successful sign-in for a user with `onboarding_completed_at` null, redirect to /app/onboarding. For users with completed onboarding, redirect to /app. Add middleware that enforces this: if `onboarding_completed_at` is null and the path isn't /app/onboarding or /signout, redirect to /app/onboarding."

> Prompt 5: "Build the onboarding wizard at /app/onboarding. 5 steps managed with React Hook Form state (no separate routes per step — single page with conditional rendering):
>
> **Step 1 (welcome)**: Persian message: 'سلام {نام}، خوش اومدی. اینجا شبکه‌ی استعدادهای AI سازمانه. آدم‌هایی که با AI کار می‌کنن، چیزایی می‌سازن، یا تو domain خودشون از AI استفاده می‌کنن.' Two buttons: 'شروع کنیم' و 'بعداً'. 'بعداً' هم redirect به /app ولی onboarding_completed_at رو null نگه می‌داره.
>
> **Step 2 (identity)**: Radio with three options: 'بیشتر کد می‌نویسم (Cursor، Claude Code، Copilot، ...)' / 'متخصص حوزه‌مم (HR، Finance، Marketing، حقوقی...) و از AI استفاده می‌کنم' / 'هردو'. خط آخر: 'این فقط برای personalize کردن تجربه‌ست. هر دو بعداً قابل تغییره.' On select, set users.onboarding_choice.
>
> **Step 3 (branched form)**: Different fields based on Step 2 choice:
>   - **Builder**: name (pre-filled), role_title, github_username (اختیاری, hint 'پروژه‌هات verified می‌شه'), bio
>   - **Domain Expert**: name, role_title, domains (multi-select از /api/domains)، years_experience per domain، bio با placeholder 'مخصوصاً اگه از AI استفاده می‌کنی، چه‌جور؟'
>   - **Hybrid**: همه‌ی فیلدها — domain selection + GitHub + technical skills + bio
>
> **Step 4 (first action)**: Persona-aware CTA cards. Builder sees 'ثبت اولین پروژه' (primary) و 'نگاهی به سازمان' (secondary). DE sees 'برو به Challenge های مرتبط با {domain}' و 'نگاهی به سازمان'. Hybrid sees سه گزینه.
>
> **Step 5 (confidence)**: 'چقدر confident هستی که این پلتفرم به‌کارت میاد؟' Radio: خیلی / متوسط / کم / نمی‌دونم. Save to users.onboarding_confidence.
>
> On final submit: set onboarding_completed_at = now(), redirect to chosen destination from Step 4."

**انسان review:** invite token باید expire داشته باشه (۷ روز). یک‌بار مصرف باشه. اگه expire شد، صفحه‌ی خطای واضح نشون بده. **مهم‌تر**: قبل از rollout، خودت ۵ بار onboarding رو با persona های مختلف طی کن. اگه Domain Expert flow feel می‌کنه second-class در مقایسه با Builder، **قبل از launch fix کن**. این مهم‌ترین تست تجربه‌ی فاز ۱ هست.

### هفته ۳ — Profile (manage & refine)

**Deliverable:** کاربر می‌تونه پروفایلش رو edit کنه — اضافه/حذف skill و domain، تغییر bio، آپدیت avatar. این صفحات **management surface** هستن، چون داده‌ی اولیه از onboarding wizard (هفته ۲) اومده.

**Spec:**
- صفحه‌ی edit: نام، role title، bio، avatar، GitHub username، LinkedIn URL، skill ها، domain expertise
- skill و domain از taxonomy ثابت انتخاب می‌شن (multi-select با search)
- صفحه‌ی پروفایل عمومی: `/u/[username]`
- role_badge محاسبه‌شده (Builder/DE/Hybrid)

**نکته‌ی dependency**: Prompt های schema (1 و 5) **قبل از** wizard هفته ۲ باید اجرا بشن، چون wizard به taxonomy ها reference می‌ده. در عمل: یا اول این دو prompt رو اجرا کن بعد برگرد به Week 2 Prompt 5، یا schema ها رو در همون prompt 1 هفته ۲ اضافه کن.

**Claude Code Prompts:**

> Prompt 1: "Add schema for `skills` and `user_skills` tables. Create a seed file at /scripts/seed-skills.ts that inserts ~150 skills across categories: language (Python, TypeScript, ...), framework (React, Next.js, Django, ...), tool (Docker, Git, ...), concept (RAG, Agents, Prompt Engineering, ...), ai_tool (Cursor, Claude Code, Lovable, v0, Bolt, ChatGPT, ...). Use these exact slug formats: lowercase with hyphens."

> Prompt 2: "Build the profile edit page at /app/profile/edit. Form fields: name, role_title, bio (textarea, max 500 chars), github_username, linkedin_url. Use React Hook Form + Zod. Save via /api/profile (PUT). Show success toast on save."

> Prompt 3: "Add skill selection to the profile edit page. Component: a multi-select with search that fetches /api/skills (returns all skills grouped by category). For each selected skill, the user picks a claimed_level (1-5) via a small dropdown. On save, sync user_skills table (insert new, delete removed, update levels)."

> Prompt 4: "Generate default avatars using `@dicebear/core` and `@dicebear/collection` (style: 'initials' or 'shapes'). Avatar is derived from user.name as seed — no upload needed in MVP. Show generated avatar on profile, navbar, and people directory. Add an optional `avatar_url` field that, if filled, overrides the generated one (user can paste an imgur/cloudinary URL if they want). Max URL length 500 chars, validate as URL with Zod."

> Prompt 5: "Add schema for `domains` and `user_domain_expertise` tables. Seed ~11 domains: hr, finance, marketing, legal, operations, sales, customer_success, product, healthcare, education, other. Slug is lowercase with underscores. The `name` field should be Persian + English (e.g., 'منابع انسانی · Human Resources'). This taxonomy supports the Domain Expert persona (non-technical users who use AI tools in their domain work)."

> Prompt 6: "Add domain expertise selection to the profile edit page (separate section below skills). Multi-select dropdown showing all domains grouped naturally. For each selected domain, optional fields: `years_experience` (number input, 0-50) and `notes` (short text, max 200 chars, free-form context). On save, sync user_domain_expertise table. Validation with Zod. On the public profile (/u/[username]), show domain expertise below skills as a small list with years if provided (e.g., 'HR · 10 years', 'L&D · 4 years')."

> Prompt 7: "Compute and display a `role_badge` on user profiles and user cards. Logic at /lib/users/role-badge.ts: 'domain_expert' if user has user_domain_expertise but no user_skills (or very few — threshold: < 3 technical skills), 'builder' if user has user_skills but no user_domain_expertise, 'hybrid' if user has both. Display as a small badge near the user's name on profile header and user cards. Styling: subtle micro-text badge with light background, NOT colored or competitive. No leaderboard differentiation in phase 1. The badge is identity, not ranking."

> Prompt 8: "Create the public profile page at /app/u/[username]. Show: avatar, name, role, bio, role_badge (Builder/Domain Expert/Hybrid), social links, list of skills grouped by category (verified ones get a green checkmark, unverified shown plain), list of domain expertise with years. Loading state with skeleton."

**انسان review:** اگه taxonomy ضعیفه، اضافه کن. اولین تستر بشو خودت — یه پروفایل کامل پر کن.

### هفته ۴ — Projects

**Deliverable:** کاربر می‌تونه پروژه ثبت کنه با لینک GitHub

**Spec:**
- فیلدها: title، description، github_url، demo_url، cover_image، skill ها، AI tool ها، **stage**
- stage یه enum با ۵ مقدار: `Experiment`، `Weekend Hack`، `Building`، `Shipped`، `Maintained`. این پیام فرهنگی مهمی می‌ده: weekend hack هم اوکیه. ضد-imposter syndrome کار می‌کنه.
- چک‌باکس الزامی: "این پروژه proprietary سازمان نیست و مالکیتش با منه"
- اگه github_url وارد شده، یه دکمه‌ی "Fetch from GitHub" که name و description رو پر کنه

**Claude Code Prompts:**

> Prompt 1: "Add schema for `projects`, `project_skills`, and `project_ai_tools` tables. The projects table needs an `is_personal_project_confirmed` boolean field that defaults to false. Add a `stage` enum field with values: 'experiment', 'weekend_hack', 'building', 'shipped', 'maintained' (default: 'experiment'). Also add a nullable `last_activity_at` timestamp field (will be filled by activity polling later)."

> Prompt 2: "Build the project creation form at /app/projects/new. Fields as per spec, including a `stage` select with 5 options: 'Experiment', 'Weekend Hack', 'Building', 'Shipped', 'Maintained' (each with a short tooltip explaining the difference — e.g. Weekend Hack: 'A quick build, not necessarily polished. Sharing is encouraged.'). Use React Hook Form + Zod. The IP confirmation checkbox is required (Zod validation). Submit button is disabled until checkbox is checked. Show the disclaimer text in Persian: '{متن disclaimer}'. On submit, POST to /api/projects."

> Prompt 3: "Implement GitHub metadata fetching. Add a utility at /lib/github.ts that takes a GitHub URL and returns: name, description, languages (top 5), stars, last_commit_date, readme (first 3000 chars), file_list (top 20). Use the GitHub REST API (no auth needed for public repos, but support an optional token from env). When the user enters a github_url and clicks 'Fetch', call /api/github/preview which uses this utility and returns the metadata. Pre-fill title and description from the fetched data."

> Prompt 4: "Build the project detail page at /app/projects/[id]. Show: cover image, title, **stage badge** (color-coded: experiment=gray, weekend_hack=blue, building=green, shipped=purple, maintained=gold), description, skills, ai_tools, github link, demo link, owner profile link. If viewer is the owner, show 'Edit' button."

> Prompt 5: "Build the user's projects list at /app/dashboard/projects. Show user's own projects in cards, with status (draft/published), edit and delete buttons."

**انسان review:** متن disclaimer رو با حقوقی چک کن. این مهم‌ترین متن legal فاز ۱ هست.

### هفته ۵ — Discovery & Directory

**Deliverable:** اعضای سازمان می‌تونن همدیگه رو search و filter کنن

**Claude Code Prompts:**

> Prompt 1: "Build the people directory at /app/people. Show a grid of user cards (avatar, name, role, top 3 skills). Each card links to /u/[username]. Add pagination (20 per page). Server-rendered."

> Prompt 2: "Add filters to the people directory: filter by skill (multi-select), filter by AI tool used in any project, search by name (text input). Filters update URL query params so they're shareable. Use server components for filtering, no client-side data fetching."

> Prompt 3: "Build the projects directory at /app/projects. Same pattern as people: grid of project cards, filter by skill and AI tool, search by title. Sort options: newest, most starred (using github_metadata.stars)."

### هفته ۶ — CHRO Dashboard

**Deliverable:** ادمین یه view با متریک‌های کل سازمان داره

**Spec:** متریک‌ها:
- Total users, active users (active = profile complete + at least 1 project)
- Skill distribution (top 20 skills, bar chart)
- AI tool adoption (pie chart از top 10 ابزار)
- Activity timeline (پروژه‌های ثبت‌شده در هر هفته، آخر ۱۲ هفته)
- Top builders (top 10 با بیشترین پروژه)
- Verification rate (درصد skill های verified از کل claimed)

**Claude Code Prompts:**

> Prompt 1: "Create an admin section at /app/admin protected by middleware that checks user.is_admin. Add a sidebar nav with: Dashboard, Users, Invitations."

> Prompt 2: "Build /app/admin (the main dashboard) with the following metric cards at the top: Total Users, Active Users, Total Projects, Avg Projects Per User. Use Tremor or Recharts for charts. Below the cards, show: (1) Bar chart of top 20 skills by user count, (2) Pie chart of AI tool adoption, (3) Line chart of weekly project submissions (last 12 weeks), (4) Top 10 builders table."

> Prompt 3: "Add an 'Export to Excel' button on the admin dashboard that exports all current metrics + a sheet of all users with their skills + a sheet of all projects. Use a library like exceljs."

> Prompt 4: "Build /app/admin/users with a table of all users: name, email, role, projects count, skills count, last_active. Each row has an action menu: 'View profile', 'Deactivate'. Add search and pagination."

> Prompt 5: "Build /app/admin/invitations with a list of all invitations (pending, accepted, expired) and a form to send a new invitation (single or bulk paste of emails). On submit, create invitation records and send emails."

**انسان review:** این صفحه باید بهترین polish رو بگیره. این چیزیه که CHRO به CEO و بقیه نشون می‌ده. وقت بذار روی visual hierarchy و spacing.

### هفته ۷ — AI Skill Verification + Build-in-Public

**Deliverable:** Skill ها AI-driven verified می‌شن + فعالیت GitHub زنده پروفایل‌ها رو نشون می‌ده

این هفته دوتا feature موازی داره که از یه infrastructure مشترک (GitHub API client) استفاده می‌کنن. منطقیه با هم بسازی.

#### Part A — AI Skill Verification

**Claude Code Prompts:**

> Prompt 1: "Set up a simple cron-based background job system using `node-cron`. Create a file at /lib/jobs/scheduler.ts that runs on app startup (or as a separate Docker service if preferred). Add a job runner pattern: each job is an async function with a name, schedule, and handler. Logs to stdout. No Redis, no queue — just sequential execution. This will host verification and GitHub polling jobs."

> Prompt 2: "Create an AI gateway abstraction at /lib/ai/gateway.ts that wraps the LLM provider. It should expose a `verifySkills(input)` function that takes structured input and returns a typed `VerificationResult`. The provider config (API key, base URL, model) comes from env vars. Use the OpenAI SDK format (since most Iran proxies support it)."

> Prompt 3: "Add schema for `verification_runs` table. Implement the verification logic: (1) Trigger: when a project is created with github_url and at least 1 skill claimed, mark it as 'verification_pending' and the next cron tick (every 5 minutes) picks it up. (2) Job: fetch GitHub metadata, call the AI gateway with the verification prompt, validate the JSON output with Zod, update user_skills.verified for each verified skill, save the run to verification_runs. Use a simple `pending_verification_at` field on projects to mark queue position."

> Prompt 4: "Add the verification prompt template at /lib/ai/prompts/verify-skill.ts. Use the prompt provided in {path-to-prompt-doc}. Make it a function that takes structured params and returns a formatted string."

> Prompt 5: "Add UI for verification: (1) On profile page, verified skills show a green checkmark with tooltip 'Verified via AI analysis of GitHub repo: {repo_name}'. (2) On admin dashboard, add a 'Verification rate' metric (verified skills / total claimed). (3) Add /app/admin/verifications page that lists all verification_runs with status, can be retried manually if failed."

**انسان review:** اولین ۱۰ verification رو دستی نگاه کن. آیا LLM داره مسخره‌بازی در میاره؟ آیا threshold 0.7 درسته یا باید بالاتر/پایین‌تر بشه؟ این رو با داده‌ی واقعی کالیبره کن.

#### Part B — Build-in-Public Activity Stream

**هدف:** پروفایل‌ها از پورتفولیوی static به موجود زنده تبدیل بشن. کاربر بدون انجام کاری، فعالیت GitHub ش روی پروفایلش به‌روز می‌مونه. این بزرگ‌ترین ابزار engagement فاز ۱ هست.

**Claude Code Prompts:**

> Prompt 6: "Add schema for `project_activity` table (fields: id, project_id FK, event_type enum, payload jsonb, occurred_at timestamp, fetched_at timestamp). Also add `last_activity_at` to projects table if not already there. Create indexes on (project_id, occurred_at desc) and (occurred_at desc) for feed queries."

> Prompt 7: "Create a GitHub activity polling job at /lib/jobs/github-activity.ts hooked into the cron scheduler. Logic: (1) Run every 6 hours. (2) Find all projects with github_url where fetched_at is null or older than 6 hours, limit 50 per run (to stay safely under rate limit). (3) For each, fetch last 30 commits, last 5 releases, current star count via GitHub REST API. (4) Diff against existing project_activity records (use commit SHA / release tag as dedup key). (5) Insert new events. (6) Update project.last_activity_at to the latest commit timestamp. Use authenticated GitHub token from env."

> Prompt 8: "Add a derived 'building_status' for users via a SQL view or computed query: 'currently_building' if any of their projects has a commit in the last 7 days, 'shipped' if has releases but no recent commits in 30 days, 'idle' otherwise. Expose via /lib/users/status.ts."

> Prompt 9: "Add UI for activity (without a dedicated feed page in MVP): (1) On profile page, show building_status as a small colored pill near the user's name: green dot + 'Currently Building' / purple + 'Shipped' / gray + 'Idle'. (2) On each project card and detail page, show last activity timestamp ('Last commit 2 days ago'). The full activity feed page (/app/feed) is deferred to phase 2 — data is being collected from week 7 onward so it's ready when needed."

> Prompt 10: "Add to the CHRO dashboard: a new metric card 'Currently Building' (count of users with that status), and a line chart 'Weekly commit activity across the org' (sum of commits per week, last 12 weeks). Add to top builders table a new column 'Commits last 30d'."

**انسان review:** GitHub API rate limit رو حواست باشه (با authenticated token ۵۰۰۰ req/hour). اگه ۲۰۰+ پروژه داری، هر ۶ ساعت polling حدود ۸۰۰ req می‌کشه — راحته. ولی اگه فاز پابلیک ۱۰،۰۰۰ پروژه شد، باید tier کنی (پروژه‌های فعال هر ۶ ساعت، idle ها هر ۲۴ ساعت).

**نکته‌ی privacy:** فقط public repo ها polling می‌شن. کاربر می‌تونه private repo لینک بده، ولی activity stream فقط برای public ها کار می‌کنه و این تو UI شفاف باشه.

### هفته ۸ — Challenge System (Domain Buckets + Spotlight) + Polish + Soft Launch

**Deliverable:** سیستم Challenge کامل (domain bucket + sub-problem + spotlight هفتگی + community proposal) فعاله. آماده برای onboard اولین ۵۰ نفر.

این هفته core engagement engine رو می‌سازی: Challenge های دامنه‌ای، sub-problem ها، پیشنهاد توسط community با تأیید admin، spotlight هفتگی. این هفته سنگین‌ترین هفته‌ی فاز ۱ هست. اگه scope overflow کرد، **Sponsor Announcement emails** و **Follow Challenge** اولین چیزهایی هستن که می‌تونن به ماه ۳ موکول بشن.

**Claude Code Prompts:**

> Prompt 1: "Add schema for `challenges`, `challenge_problems`, `project_challenge_problems`, and `project_upvotes` tables (use definitions from {path-to-schema-doc}). Add `upvote_count` denormalized field to projects table. Create indexes on (challenge_id, status), (challenge_problem_id), (project_id), and (is_spotlight, spotlight_ends_at). Seed 5 initial Challenges (HR, Finance, Customer Support, Engineering, General) with status='active' bypassing review."

> Prompt 2: "Build admin pages for the challenge review queue at /app/admin/challenge-queue: (1) Two tabs: 'Pending Challenges' and 'Pending Problems'. (2) Each entry shows proposer, title, description, proposed_at. (3) Actions: 'Approve' (sets status='active', sends approval email to proposer) or 'Reject' (requires rejection_reason, sends rejection email). (4) Show count badge on admin sidebar nav."

> Prompt 3: "Build user-facing Challenge proposal flow at /app/challenges/propose: (1) Form: title, domain Challenge (optional select — if filled, this is a Problem proposal; if empty, it's a new Challenge proposal), description (markdown), sponsor_team (optional, only for new Challenges). (2) Validation with Zod. (3) On submit, insert with status='pending_review', send email to admin, show 'thanks, we'll review within 48h' message."

> Prompt 4: "Build the Challenge directory at /app/challenges: (1) Grid of cards for all active Challenges, sorted by activity (recent submissions, upvotes, problems added). (2) Each card shows: title, description excerpt, count of active problems, count of submitted projects, sponsor_team if present. (3) Filter/search by title. (4) 'Propose new Challenge' button at top."

> Prompt 5: "Build the Challenge detail page at /app/challenges/[slug]: (1) Header with title, description, sponsor_team, 'Follow' button (toggles user's follow status — saved in a `challenge_follows` table; create that schema too). (2) List of active Problems within this Challenge, each linkable. Each Problem card shows: title, excerpt, count of submitted projects, top upvoted project (if any). (3) 'Propose new Problem in this Challenge' button. (4) **Domain Experts section**: query users where any of their user_domain_expertise.domain.slug matches this challenge.slug, sort by years_experience desc then last_active_at desc, show top 8 as a compact grid of user cards (avatar + name + 'X years' if years_experience provided). Section header: 'Domain experts in this area · {count}'. This makes Domain Expert persona visible on Challenge pages without giving them a separate track. (5) Archive section for resolved/archived problems below the fold."

> Prompt 6: "Build the Problem detail page at /app/challenges/[slug]/problems/[id]: (1) Full problem description with markdown. (2) 'Submit your project' button (only visible to logged in users with at least one published project). (3) Grid of all projects linked to this Problem, sorted by upvote_count desc. (4) Each project card shows submission_notes excerpt and upvote button. (5) Spotlight badge if currently spotlighted. (6) Past winner section if previous spotlight cycle had a winner."

> Prompt 7: "Extend the project create/edit form (from Week 4) to allow linking to ChallengeProblems: (1) Optional multi-select at the bottom of the form labeled 'این پروژه به کدوم Problem ها می‌خوره؟' that fetches active problems grouped by Challenge. (2) For each selected problem, an optional submission_notes text field. (3) On save, sync project_challenge_problems link table. (4) Also add a 'Submit to a Problem' button on the project detail page (for retroactive linking)."

> Prompt 8: "Build the upvote mechanism on projects (platform-wide): (1) An upvote button on project cards (in directories, on challenge problem pages) and on project detail pages. (2) Click toggles upvote (insert/delete project_upvotes record, update denormalized projects.upvote_count). (3) Self-upvote not allowed (UI hides button on own projects). (4) Use optimistic UI for snappy feel. (5) Display upvote_count next to button."

> Prompt 9: "Build Spotlight management (admin only): (1) On Problem detail page, admin sees an 'Spotlight this Problem' button (only if no current spotlight exists). (2) Clicking sets is_spotlight=true, spotlight_starts_at=now, spotlight_ends_at=now+7days. (3) Send email to all users (or those who follow this Challenge if implemented). (4) On the home page (/app/dashboard or /app), show a 'This Week's Spotlight' banner with the spotlighted problem, time remaining, and CTA to view. (5) After 7 days, the banner auto-hides; admin gets a notification to pick a winner (a project linked to that problem). (6) Picking a winner sets spotlight_winner_project_id and awards 'Spotlight Solver' badge to the project owner."

> Prompt 10: "Seed initial Problems for each of the 5 active Challenges (HR, Finance, CS, Engineering, General) — 2-3 problems each, with rich descriptions. These are the 'first 10 problems' the platform launches with. Use realistic, AI-buildable, general-purpose problems (e.g., 'AI-powered meeting notes summarizer for HR interviews', 'Vendor contract Q&A bot built on RAG', etc.)."

> Prompt 11: "Trim badges to 3 auto-awarded essentials: 'First Project' (1 published project), 'Spotlight Solver' (won a spotlight week), 'Currently Building Streak' (commits in 4+ consecutive weeks). Award logic runs after relevant events, no notification system needed (just visible on profile)."

> Prompt 12: "Polish pass: review all pages for loading states (Skeleton components), error states (toast), and empty states with helpful messages. Add Persian translations for English text. Test on mobile viewport — fix any overflow issues. Pay special attention to: challenge directory, problem detail page, project submission to problem, spotlight banner. These are the highest-traffic surfaces."

**کارهای موازی این هفته (manual curation برای ۵۰ نفر اول):**

این بخش به همان اندازه‌ی کدی که می‌نویسی اهمیت داره. آدم‌های اول کیفیت کل پلتفرم رو می‌سازن:

- **انتخاب دستی ۵۰ نفر**، نه random از ۲۵۰۰. ترکیب پیشنهادی: ۱۵ نفر vibe coder شناخته‌شده (که پروژه‌ی AI-native دارن و می‌تونن seed بشن)، ۲۰ نفر کنجکاو ولی هنوز شروع نکرده (که spotlight و Problem های واقعی جذبشون می‌کنه)، ۱۵ نفر از تیم‌های متنوع (بانکی، کلود، فرانت، دیتا) برای representativeness.
- **با هر نفر یه پیام شخصی** (نه ایمیل جمعی). در حد ۳-۴ جمله: چرا تو، چی هست، اولین قدم.
- **یه workshop ۳۰ دقیقه‌ای آنلاین** قبل از launch با همین ۵۰ نفر. دمو لایو از: ساخت پروفایل، ثبت یه پروژه، link کردن به یه Problem موجود.
- **اولین Spotlight رو خودت پر کن**: قبل از launch، یه Problem از HR یا Engineering رو spotlight کن و یکی از پروژه‌های نمونه رو خودت linkش بزن. این هم spotlight رو "occupied" نشون می‌ده، هم به بقیه می‌گه چی انتظار می‌ره.
- **یه گروه تلگرام/Slack بسته** فقط برای این ۵۰ نفر، برای feedback سریع و حس exclusivity. این کانال جاییه که کاربرها می‌تونن مستقیم Problem پیشنهاد بدن قبل از اینکه فرم پلتفرم رو پیدا کنن.
- **یه فرم feedback ساده** درون اپ (یا حتی لینک به یه فرم گوگل).

**اولین Spotlight پیشنهادی**:
> **"AI-Powered Internal Tool"** (داخل Challenge `General`) — یه ابزار کوچیک با Cursor، Claude Code، یا Lovable بساز که یه مسئله‌ی روزمره‌ی کار خودت رو حل کنه. می‌تونه ۲ ساعت کار باشه یا ۲ روز. غیر-proprietary، با لینک GitHub و دموی کوتاه.

به عمد ساده‌ست تا حداکثر مشارکت بگیره. spotlight های بعدی می‌تونن narrow تر و challenging تر باشن.

---


## بخش ۵ — Prompt Engineering Best Practices برای Claude Code

این پترن‌ها هر prompt رو موفق‌تر می‌کنه:

### پترن ۱: همیشه context فعلی رو بده

اشتباه: "Add a profile page."

درست: "We have a Next.js 15 app with App Router. Auth is set up via Better Auth (session in cookie, accessible via `getSession()` from `/lib/auth.ts`). The users table has these fields: {list}. Add a profile edit page at /app/profile/edit that..."

### پترن ۲: شکست تسک‌های بزرگ

اشتباه: "Implement the complete project module."

درست: ۵ prompt جدا — schema، API، form، list page، detail page. هر کدوم بعد از review انسانی.

### پترن ۳: همیشه type و validation بخواه

اضافه کن به هر prompt: "Use TypeScript strict types. Validate all inputs with Zod. Use typed Drizzle queries (no raw SQL unless necessary). All API routes should return typed JSON."

### پترن ۴: test کوچک ولی واقعی

بعد از هر feature: "Add a basic test at /tests/{feature}.test.ts that covers the happy path and one error case. Use Vitest."

### پترن ۵: اگه گیر کرد، context بده نه پرامپت تکراری

اگه Claude Code یه bug رو نتونست fix کنه:
- خود کد error رو copy کن
- بگو دقیقاً چی کار کردی که خطا اومد
- ساختار folder رو بهش بده
- نه فقط "fix this"

### پترن ۶: branch هر feature

```bash
git checkout -b feat/profile-edit
# prompt
# review
# test
# commit
git checkout main
git merge feat/profile-edit
```

این به Claude Code هم کمک می‌کنه چون می‌تونه context تمیز داشته باشه.

---

## بخش ۶ — متریک‌های موفقیت ۲ ماه

این ها رو هر هفته track کن:

| متریک | هدف هفته ۴ | هدف هفته ۸ |
|---|---|---|
| Features deployed | 5 | 20 |
| Active users (admin + dev test) | 3 | 50 |
| Onboarding completion rate | - | ≥ ۸۵٪ |
| DE confidence "خیلی" یا "متوسط" در onboarding | - | ≥ ۸۰٪ |
| Projects ثبت شده | 5 | 75 |
| Verification موفق | - | ≥ ۷۰٪ |
| "Currently Building" users | - | ≥ ۲۵ |
| Domain Expert profiles (DE یا Hybrid) | - | ≥ ۸ |
| Active Challenges | - | ۵ (seed) |
| Active Problems | - | ≥ ۱۰ (seed + community) |
| Problem proposals از community | - | ≥ ۵ |
| Project → Problem links (spotlight اول) | - | ≥ ۱۲ |
| Bug های open | < 10 | < 5 |
| Uptime | - | > 99٪ |

اگه آخر هفته ۸، **۵۰ نفر active، ۸۵٪ onboarding completion، ۸۰٪ DE confidence مثبت، ۷۵ پروژه، ۷۰٪ verification rate، ۲۵ نفر "Currently Building"، spotlight اول با ۱۲+ submission، ۵+ پیشنهاد Problem از community، و ۸+ پروفایل Domain Expert** داری، MVP موفقه و آماده‌ی scale به ۲۵۰۰ نفر تو ماه ۳-۴ هستی.

دو سیگنال product-market-fit که نمی‌تونی fake کنی:
- **Onboarding completion rate < ۷۰٪** یعنی wizard خیلی طولانی یا confusing ست. قبل از scale، wizard رو با ۵ نفر شخصاً run کن، watch کن کجا confused می‌شن.
- **DE confidence < ۶۰٪** یعنی Domain Expert flow کار نمی‌کنه. این رو با interview شخصی fix کن، نه با A/B test.

---

## بخش ۷ — ریسک‌ها و mitigation

| ریسک | احتمال | اثر | mitigation |
|---|---|---|---|
| LLM provider تو ایران قطع بشه | متوسط | بالا | از ۲ provider استفاده کن، fallback داشته باش |
| Verification quality پایین | بالا | متوسط | از هفته ۷ شروع به کالیبره کن، human override بذار |
| Engagement کم بعد invite | بالا | بالا | Spotlight هفتگی بدون تأخیر اجرا کن، hand-pick اولین ۵۰ نفر |
| Domain Expert ها feel marginal کنن | متوسط | بالا | تو ۵۰ نفر اول حتماً ۱۰-۱۵ نفر Domain Expert باشن، onboarding پیام جداگانه‌ی برای DE ها بنویس، یه DE شخصاً تو spotlight اول مشارکت کنه |
| Spotlight اول submission کم بگیره | متوسط | بالا | Problem اول رو ساده و آشنا انتخاب کن، خودت اولین submission رو بذار، در گروه بسته invite شخصی بفرست |
| Community هیچ Problem پیشنهاد نده | متوسط | بالا | تو گروه بسته فعالانه ازشون بپرس "چه مشکلی روزانه می‌بینی؟"، Problem های اولیه رو از همون مکالمه‌ها استخراج کن و خودت submit کن (با اسم اون‌ها) |
| Admin approval bottleneck بشه (پاسخ کند) | بالا | متوسط | فقط تو admin هستی، باید روزانه ۱۵ دقیقه برای review اختصاص بدی. اگه ۲ روز عقب بیفتی، community ول می‌کنه. |
| Challenge directory جذاب نباشه | متوسط | متوسط | activity-driven sort و spotlight banner باعث می‌شن همیشه چیزی برای دیدن باشه. اگه pool خشک شد، spotlight ها رو تشدید کن. |
| GitHub API rate limit | پایین | متوسط | از authenticated token استفاده کن، tiered polling برای فاز پابلیک پیاده کن |
| هفته ۷ overflow (دوتا feature موازی) | متوسط | متوسط | اگه deadline تنگ شد، Part B (Build-in-Public) رو به هفته ۸ ببر، verification اولویت داره |
| هفته ۸ overflow (Challenge system سنگینه) | بالا | بالا | Follow Challenge و Sponsor Announcement Emails رو به ماه ۳ ببر اگه لازم شد. core Challenge + Spotlight اولویت دارن. |
| Scope creep از طرف stakeholder ها | بالا | بالا | spec sheet هر هفته signed off بشه |
| Claude Code کد ضعیف بزنه | متوسط | بالا | review جدی هر prompt، tests بعد هر feature |
| تأخیر زیرساخت (VM، DNS، SMTP) | متوسط | بالا | هفته ۱ این‌ها رو close کن، هر روز delay = هر روز delay |

---

## بخش ۸ — بعد از فاز داخلی (preview ماه ۳ به بعد)

این فقط برای جهت‌گیریه، نه commitment:

**ماه ۳-۴**: کامل کردن onboarding ۲۵۰۰ نفر، بهبود verification، اضافه کردن Intrapreneurship Lane، اضافه کردن **endorsement-based domain verification** (Builder ها می‌تونن روی پروفایل Domain Expert ها endorse کنن: "این آدم تو پروژه‌ی من به‌عنوان HR expert مشاوره داد")

**ماه ۵**: Multi-tenancy واقعی، invite ۲-۳ شرکت IT دیگه (هر کدوم ۵۰ نفر)

**ماه ۶**: Public profile feature، discovery layer بیرونی، API برای recruiter ها

**ماه ۷**: Monetization model — احتمالاً subscription برای شرکت‌ها برای search و discovery + featured profile برای individual

**ماه ۸**: Public launch با waitlist برای کل تک‌ورکرای ایران

---

*این document یه living plan هست. هر هفته بعد از retro به‌روز رسانی بشه.*
