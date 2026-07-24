# AIGraph — Claude Code Context

This is the AIGraph project — an AI talent graph platform for Iranian tech workers. Phase 1 is an internal MVP for ~2,500 employees at a large Iranian IT company, invite-only, launching in 8 weeks.

## Read these BEFORE generating any UI or code

1. **`/docs/DESIGN_SYSTEM.md`** (v1.1) — all visual design decisions. Read this before any UI component, page, or styling work. Non-negotiable. Pay special attention to section 4.1 (exact spacing allowlist), section 5.4 (tag collapse rule), section 7.5 (English vs Persian strings), and the "Component creation order" rule near the top. Design tokens from §2–§4 are wired into Tailwind v4 in `app/globals.css` — use the token utilities (`bg-canvas`, `text-h1`, `border-border-subtle`, …), not raw hex.
2. **`/docs/PROJECT_PLAN.md`** — the 8-week sprint plan, database schema, and feature priorities. Read this to understand sprint scope before starting any week's prompts. The schema is implemented in `lib/db/schema.ts` (Drizzle).
3. **`/docs/CODE_CONVENTIONS.md`** — naming, file structure, API patterns, error handling. Read this before writing any backend or API code.

## Stack (don't change without explicit instruction)

- Next.js 15 (App Router) + TypeScript strict mode
- Tailwind CSS v4 + shadcn/ui (customized per DESIGN_SYSTEM.md — never used as-is)
- Drizzle ORM + PostgreSQL
- Better Auth (magic link)
- Vazirmatn font (Persian + Latin)
- Lucide React (icons, stroke-width 1.5)
- node-cron for background jobs (NOT BullMQ/Redis in phase 1)
- No MinIO, no Sentry, no complex notification system in phase 1 — see PROJECT_PLAN.md section 1 for the full list of deferred infrastructure

## Hard rules

- **Persian-first UI**, dark mode only in phase 1 (light mode is phase 2)
- All tables have `org_id`, all queries scoped to `'main-org'` constant — but NO multi-tenancy features (no org-switching UI, no org-creation flow) in phase 1
- Every project requires `is_personal_project_confirmed` checkbox — this is a legal safeguard, don't remove or bypass it
- Use TypeScript strict types everywhere. Validate all inputs with Zod. No `any` types without explicit justification.
- One feature per prompt — don't bundle unrelated changes into a single generation
- After every successful prompt, the human reviews and commits before the next prompt runs
- New reusable components (status pills, badges, cards, tags) always go in `/components/atoms/` or `/components/molecules/` as separate files — never defined inline inside a page. See DESIGN_SYSTEM.md's "Component creation order" section.

## Two personas — always keep both in mind

1. **Builder** — technical users with GitHub activity, uses AI coding tools (Cursor, Claude Code, etc.)
2. **Domain Expert** — non-technical users (HR, Finance, etc.) who use AI tools in domain work. No GitHub required. Onboarding, copy, and empty states should never assume every user is a developer.

## File structure

```
CLAUDE.md               this file — repo root
/components/ui/         shadcn/ui primitives — customized per DESIGN_SYSTEM.md
/components/atoms/      project-specific atoms (StatusPill, StageBadge, VerifiedTag)
/components/molecules/  composite components (UserCard, ProjectCard, ChallengeCard, ProblemCard)
/components/layout/     Nav, Footer, PageHeader
/app/                   Next.js routes
/lib/                   utilities, DB queries, AI gateway, auth config
/scripts/               CLI scripts (invite creation, seeding)
/lib/jobs/              background jobs (cron-based)
/docs/                  DESIGN_SYSTEM.md, PROJECT_PLAN.md, CODE_CONVENTIONS.md
```

> Note: `/Repo/` is a stale scaffold from an abandoned checkout — it is
> git-ignored and not part of the app. The real app lives at the repo root.

## Language

Reply to the developer in English by default during coding sessions. Generate all user-facing UI strings in Persian, following DESIGN_SYSTEM.md section 7.5 for which specific terms stay in English (platform vocabulary like "Spotlight", "Shipped", tool names) versus which become Persian (buttons, body text, messages).

## When something is ambiguous

If a design or product decision is genuinely missing from the docs above, don't guess silently — flag it clearly in your response so a human can decide and update the relevant doc. Guessing silently is how design system drift happens.
