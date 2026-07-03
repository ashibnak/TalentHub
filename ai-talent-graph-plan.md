# AI Talent Graph of Iran — Project Plan & Architecture

نسخه ۱.۰ — برنامه‌ی ۲ ماهه فاز داخلی، با تمرکز روی توسعه‌ی AI-Native با Claude Code

---

## بخش ۱ — اصول راهنما

این پلن بر پایه‌ی سه اصل بنا شده:

**۱. Spec قبل از Code.** هر feature قبل از اینکه به Claude Code داده بشه، باید یه spec کوتاه (نیم تا یک صفحه) داشته باشه که شامل: هدف، user story، data model، UI flow، edge case ها. این spec توسط انسان نوشته میشه، نه AI.

**۲. یک feature در هر sprint کوچک.** هر prompt به Claude Code باید scope محدود داشته باشه. اشتباه رایج: "کل اپ رو بساز." اشتباه‌تر: "همه‌ی feature های auth و profile رو با هم بساز." درست: "فقط invite token system رو بساز، با تست."

**۳. Commit و Review بعد از هر prompt.** بعد از هر prompt موفق Claude Code، کد رو read کن (نه فقط run)، یه commit بزن. اگه prompt بعدی شکست خورد، می‌تونی برگردی. این discipline تو ۸ هفته صرفه‌جویی روزها می‌کنه.

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
- `MinIO` (S3-compatible، self-hosted) برای آواتار و اسکرین‌شات
- یا فایل سیستم محلی برای فاز ۱ اگه می‌خوای ساده‌تر شروع کنی

**Background Jobs**
- `BullMQ` با `Redis` برای job queue (مخصوصاً برای AI verification)

**AI Layer**
- یه `ai-gateway` ساده که abstraction روی LLM provider بده
- فاز ۱: provider ایرانی (آوالای، گیلاس‌نت و...)
- فاز ۲: self-hosted `Qwen 2.5 Coder` با `Ollama` برای privacy

**Deployment**
- Docker Compose برای فاز ۱
- یه VM داخل کلود سازمان با `nginx` reverse proxy
- backup روزانه‌ی postgres
- `Sentry` self-hosted برای error tracking

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
│  └──────────────────────────────────┘   │
└──────┬──────────────┬──────────────┬────┘
       │              │              │
       ▼              ▼              ▼
   PostgreSQL      MinIO         Redis + BullMQ
   (Drizzle)     (Storage)      (Job Queue)
                                      │
                                      ▼
                              ┌───────────────┐
                              │  AI Workers   │
                              │  (Verification)│
                              └───────┬───────┘
                                      │
                                      ▼
                              External LLM Provider
                              (Iran proxy or local Qwen)
```

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
  status: enum('pending', 'accepted', 'expired')
  expires_at: timestamp
  created_at: timestamp
}

// audit_logs - برای compliance و security
audit_logs {
  id: uuid (PK)
  user_id: uuid?
  action: string  // 'user.login', 'project.created', etc.
  metadata: jsonb
  ip_address: string?
  created_at: timestamp
}
```

---

## بخش ۳ — طراحی AI Skill Verification (نسخه‌ی ساده)

این feature تو فاز ۱ به ساده‌ترین شکل ممکن. هدف: اعتماد ابتدایی، نه perfection.

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

### هفته ۲ — Auth & Invite System

**Deliverable:** کاربر می‌تونه با invite token وارد بشه

**Spec کوتاه:**
- ادمین تو CLI/script یه invite می‌سازه (`pnpm invite new email@example.com`)
- ایمیل magic link به کاربر می‌ره
- کاربر روی link کلیک می‌کنه → session ساخته میشه
- اگه اولین بار وارد میشه → onboarding flow (تکمیل نام، role)
- اگه نه → داشبورد

**Claude Code Prompts:**

> Prompt 1: "Add the database schema for `users`, `orgs`, and `invitations` tables using Drizzle. Use the schema definitions from {path-to-schema-doc}. Create migration files. Add a seed script that creates one default org named 'فناپ' (or {your-org-name}) with slug 'main-org'."

> Prompt 2: "Implement invitation system: (1) A CLI script at /scripts/create-invite.ts that takes an email arg, generates a token, saves to invitations table, and prints a link. (2) An API route /api/invitations/[token] that validates and consumes the token, creating a user. (3) An email-sending utility using nodemailer with SMTP config from env vars."

> Prompt 3: "Install Better Auth and configure it with magic-link email provider. Wire it to use the SMTP utility. After successful sign-in for a new user, redirect to /onboarding. For existing users, redirect to /dashboard. Add middleware to protect /dashboard and all sub-routes."

**انسان review:** invite token باید expire داشته باشه (۷ روز). یک‌بار مصرف باشه. اگه expire شد، صفحه‌ی خطای واضح نشون بده.

### هفته ۳ — Profile

**Deliverable:** کاربر می‌تونه پروفایلش رو بسازه و edit کنه

**Spec:**
- فیلدها: نام، role title، bio، avatar، GitHub username، LinkedIn URL، skill ها
- skill ها از یه taxonomy ثابت انتخاب میشن (multi-select با search)
- avatar upload به MinIO
- صفحه‌ی پروفایل عمومی: `/u/[username]`

**Claude Code Prompts:**

> Prompt 1: "Add schema for `skills` and `user_skills` tables. Create a seed file at /scripts/seed-skills.ts that inserts ~150 skills across categories: language (Python, TypeScript, ...), framework (React, Next.js, Django, ...), tool (Docker, Git, ...), concept (RAG, Agents, Prompt Engineering, ...), ai_tool (Cursor, Claude Code, Lovable, v0, Bolt, ChatGPT, ...). Use these exact slug formats: lowercase with hyphens."

> Prompt 2: "Build the profile edit page at /app/profile/edit. Form fields: name, role_title, bio (textarea, max 500 chars), github_username, linkedin_url. Use React Hook Form + Zod. Save via /api/profile (PUT). Show success toast on save."

> Prompt 3: "Add skill selection to the profile edit page. Component: a multi-select with search that fetches /api/skills (returns all skills grouped by category). For each selected skill, the user picks a claimed_level (1-5) via a small dropdown. On save, sync user_skills table (insert new, delete removed, update levels)."

> Prompt 4: "Implement avatar upload. Add a button on profile edit. Use MinIO client (s3-compatible). Upload to bucket `avatars/{user_id}.{ext}`. Save the URL to users.avatar_url. Show preview before save. Max file size 2MB, only JPG/PNG."

> Prompt 5: "Create the public profile page at /app/u/[username]. Show: avatar, name, role, bio, social links, list of skills grouped by category (verified ones get a green checkmark, unverified shown plain). Loading state with skeleton."

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

> Prompt 1: "Set up BullMQ with Redis for background jobs. Create a queue called 'verification' with worker logic at /workers/verification.ts. The worker should be runnable as a separate process via 'pnpm worker'."

> Prompt 2: "Create an AI gateway abstraction at /lib/ai/gateway.ts that wraps the LLM provider. It should expose a `verifySkills(input)` function that takes structured input and returns a typed `VerificationResult`. The provider config (API key, base URL, model) comes from env vars. Use the OpenAI SDK format (since most Iran proxies support it)."

> Prompt 3: "Add schema for `verification_runs` table. Implement the verification job logic: (1) Trigger: when a project is created with github_url and at least 1 skill claimed, enqueue a verification job. (2) Job: fetch GitHub metadata, call the AI gateway with the verification prompt (use the prompt template at /lib/ai/prompts/verify-skill.ts), validate the JSON output with Zod, update user_skills.verified for each verified skill, save the run to verification_runs."

> Prompt 4: "Add the verification prompt template at /lib/ai/prompts/verify-skill.ts. Use the prompt provided in {path-to-prompt-doc}. Make it a function that takes structured params and returns a formatted string."

> Prompt 5: "Add UI for verification: (1) On profile page, verified skills show a green checkmark with tooltip 'Verified via AI analysis of GitHub repo: {repo_name}'. (2) On admin dashboard, add a 'Verification rate' metric (verified skills / total claimed). (3) Add /app/admin/verifications page that lists all verification_runs with status, can be retried manually if failed."

**انسان review:** اولین ۱۰ verification رو دستی نگاه کن. آیا LLM داره مسخره‌بازی در میاره؟ آیا threshold 0.7 درسته یا باید بالاتر/پایین‌تر بشه؟ این رو با داده‌ی واقعی کالیبره کن.

#### Part B — Build-in-Public Activity Stream

**هدف:** پروفایل‌ها از پورتفولیوی static به موجود زنده تبدیل بشن. کاربر بدون انجام کاری، فعالیت GitHub ش روی پروفایلش به‌روز می‌مونه. این بزرگ‌ترین ابزار engagement فاز ۱ هست.

**Claude Code Prompts:**

> Prompt 6: "Add schema for `project_activity` table (fields: id, project_id FK, event_type enum, payload jsonb, occurred_at timestamp, fetched_at timestamp). Also add `last_activity_at` to projects table if not already there. Create indexes on (project_id, occurred_at desc) and (occurred_at desc) for feed queries."

> Prompt 7: "Create a GitHub activity polling worker at /workers/github-activity.ts using BullMQ (reuse the Redis setup from verification). Logic: (1) Every 6 hours, find all projects with github_url not polled in the last 6 hours. (2) For each, fetch last 30 commits, last 5 releases, current star count via GitHub REST API. (3) Diff against existing project_activity records (use commit SHA / release tag as dedup key). (4) Insert new events. (5) Update project.last_activity_at to the latest commit timestamp. Use authenticated GitHub token from env for higher rate limits."

> Prompt 8: "Add a derived 'building_status' for users via a SQL view or computed query: 'currently_building' if any of their projects has a commit in the last 7 days, 'shipped' if has releases but no recent commits in 30 days, 'idle' otherwise. Expose via /lib/users/status.ts."

> Prompt 9: "Add UI: (1) On profile page, show building_status as a small colored pill near the user's name: green dot + 'Currently Building' / purple + 'Shipped' / gray + 'Idle'. (2) On each project card and detail page, show last activity timestamp ('Last commit 2 days ago'). (3) Create /app/feed — a chronological feed of all activity across the org (last 7 days), grouped by day, showing 'X committed Y times to Z', 'A released v1.2 of B'. Use server components, paginated."

> Prompt 10: "Add to the CHRO dashboard: a new metric card 'Currently Building' (count of users with that status), and a line chart 'Weekly commit activity across the org' (sum of commits per week, last 12 weeks). Add to top builders table a new column 'Commits last 30d'."

**انسان review:** GitHub API rate limit رو حواست باشه (با authenticated token ۵۰۰۰ req/hour). اگه ۲۰۰+ پروژه داری، هر ۶ ساعت polling حدود ۸۰۰ req می‌کشه — راحته. ولی اگه فاز پابلیک ۱۰،۰۰۰ پروژه شد، باید tier کنی (پروژه‌های فعال هر ۶ ساعت، idle ها هر ۲۴ ساعت).

**نکته‌ی privacy:** فقط public repo ها polling می‌شن. کاربر می‌تونه private repo لینک بده، ولی activity stream فقط برای public ها کار می‌کنه و این تو UI شفاف باشه.

### هفته ۸ — Gamification + Polish + Soft Launch

**Deliverable:** آماده برای onboard اولین ۵۰ نفر

**Claude Code Prompts:**

> Prompt 1: "Add schema for `badges` and `user_badges` tables. Seed 7 badges: 'First Project' (criteria: 1 published project), 'AI Pioneer - Cursor' (criteria: project with cursor tool), 'AI Pioneer - Claude Code', 'Active Builder' (criteria: 3 projects in 90 days), 'Verified Talent' (criteria: 5 verified skills), **'Shipping Streak' (criteria: commits in 4+ consecutive weeks)**, **'Weekend Warrior' (criteria: 3+ weekend_hack stage projects)**. Add icon URLs (use placeholder for now)."

> Prompt 2: "Implement badge awarding logic. Create a service at /lib/badges/award.ts that runs after relevant events (project created, skill verified). It should check criteria and award badges. Add user_badges records and trigger a notification."

> Prompt 3: "Build a simple notifications system: an in-app bell icon in the navbar that shows recent events (new badge, verification complete, new invitation accepted). Click opens a dropdown. No real-time, just refresh on page load."

> Prompt 4: "Add a leaderboard page at /app/leaderboard with two tabs: (1) **'This Quarter'** — top 20 users based on a composite score: projects published × 3 + verified skills × 2 + badges × 1. (2) **'Most Active This Week'** — top 20 users by commit count in the last 7 days (using project_activity table). Show their rank, avatar, name, score/commit count, and building_status pill. The second tab is what drives weekly return visits."

> Prompt 5: "Polish pass: review all pages for loading states (use Skeleton components), error states (use toast or alert), and empty states (when there's no data yet, show helpful message). Add Persian translations for any English text in UI. Test on mobile viewport — fix any obvious overflow issues."

**کارهای موازی این هفته:**
- ۵۰ نفر اول رو شخصاً انتخاب کن. متنوع از تیم‌های مختلف.
- یه workshop ۳۰ دقیقه‌ای آماده کن: یه دمو لایو پروژه‌ت چطور ثبت بشه.
- یه Telegram/Slack group بساز برای feedback سریع از این ۵۰ نفر.
- یه فرم feedback ساده تو خود اپ بذار.

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
| Features deployed | 5 | 14 |
| Active users (admin + dev test) | 3 | 50 |
| Projects ثبت شده | 5 | 75 |
| Verification موفق | - | ≥ ۷۰٪ |
| "Currently Building" users | - | ≥ ۲۵ |
| Bug های open | < 10 | < 5 |
| Uptime | - | > 99٪ |

اگه آخر هفته ۸، **۵۰ نفر active، ۷۵ پروژه، ۷۰٪ verification rate، و ۲۵ نفر "Currently Building"** داری، MVP موفقه و آماده‌ی scale به ۲۵۰۰ نفر تو ماه ۳-۴ هستی.

---

## بخش ۷ — ریسک‌ها و mitigation

| ریسک | احتمال | اثر | mitigation |
|---|---|---|---|
| LLM provider تو ایران قطع بشه | متوسط | بالا | از ۲ provider استفاده کن، fallback داشته باش |
| Verification quality پایین | بالا | متوسط | از هفته ۷ شروع به کالیبره کن، human override بذار |
| Engagement کم بعد invite | بالا | بالا | Build-in-Public stream رو سرعت پایش بالا نگه دار، hand-pick اولین ۵۰ نفر |
| GitHub API rate limit | پایین | متوسط | از authenticated token استفاده کن، tiered polling برای فاز پابلیک پیاده کن |
| هفته ۷ overflow (دوتا feature موازی) | متوسط | متوسط | اگه deadline تنگ شد، Part B (Build-in-Public) رو به هفته ۸ ببر، verification اولویت داره |
| Scope creep از طرف stakeholder ها | بالا | بالا | spec sheet هر هفته signed off بشه |
| Claude Code کد ضعیف بزنه | متوسط | بالا | review جدی هر prompt، tests بعد هر feature |
| تأخیر زیرساخت (VM، DNS، SMTP) | متوسط | بالا | هفته ۱ این‌ها رو close کن، هر روز delay = هر روز delay |

---

## بخش ۸ — بعد از فاز داخلی (preview ماه ۳ به بعد)

این فقط برای جهت‌گیریه، نه commitment:

**ماه ۳-۴**: کامل کردن onboarding ۲۵۰۰ نفر، بهبود verification، اضافه کردن Intrapreneurship Lane

**ماه ۵**: Multi-tenancy واقعی، invite ۲-۳ شرکت IT دیگه (هر کدوم ۵۰ نفر)

**ماه ۶**: Public profile feature، discovery layer بیرونی، API برای recruiter ها

**ماه ۷**: Monetization model — احتمالاً subscription برای شرکت‌ها برای search و discovery + featured profile برای individual

**ماه ۸**: Public launch با waitlist برای کل تک‌ورکرای ایران

---

*این document یه living plan هست. هر هفته بعد از retro به‌روز رسانی بشه.*
