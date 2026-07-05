# Changelog

All notable changes to **AIGraph** (TalentHub) are documented here.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/); dates are ISO‑8601.

Live: <https://talenthub-production-3507.up.railway.app>

---

## [0.9.0] — 2026-07-05 — Self-service editing + the v4 dark redesign

### Added — own your profile (no more admin-only content)
- **Settings hub** (`/settings`, signed-in) — edit your profile (name, role title,
  bio, GitHub, LinkedIn); talent also manage **skills** (claim from the taxonomy
  with a 1–5 level, remove — verification stays system-owned) and **projects**.
- **Project editor** — `/projects/new` and `/projects/[id]/edit`: title,
  description, stage, GitHub/demo links, skills + AI-tools as toggle pills, a
  required IP-ownership confirmation, draft/publish, and delete (danger zone).
  Owners get an **edit** button on their public project page.
- **Opportunity close/reopen** for the owning sponsor (or admin), on the detail page.
- Entry points: a تنظیمات nav link, "ویرایش پروفایل" on your own public profile,
  "پروژه‌ی جدید" on the talent home.
- New queries (`me.ts`, `taxonomy.ts`), actions (`profile.ts`, `projects.ts`),
  and atoms/molecules (`PublishBadge`, `SkillCheckboxes`, `AiToolCheckboxes`,
  `ProjectForm`); shared form classes in `lib/ui.ts`.
- Security: every action is session-gated and ownership-scoped (`userId` from the
  session, never the form); http(s)-only URL validation (`lib/validation.ts`)
  so a stored link can never be a `javascript:` URL; join-table re-sync in a
  transaction. Hardened via a 6-finding adversarial review (confirmed finding
  fixed: keyboard-visible focus on the toggle pills).

### Changed — design tokens v4 "obsidian" (dark)
- **Full dark redesign** matching Amir's reference palettes, verbatim swatches:
  charcoal canvas `#222121`, surface `#2A2A2A`, near-white text/buttons
  `#FAFCFC` (+ `#E5E4E3` hover), hairline white-alpha borders, **bright teal
  `#4CD1D6`** accent (links, active, focus, logo hub), emerald `#34D399`
  verified, and the amber `#FFAB00` as a reserved micro-accent (Spotlight).
- **White primary buttons with near-black text** (new `--color-on-action`
  token); the landing's sponsor card + CTA band are now striking inverted
  near-white cards on the dark canvas.
- **Logo/favicon inverted** — white squircle, dark node-graph, teal hub.
- Funnel/error colors rebuilt for dark (`amber-400/15`, `red-400/15` chips,
  `red-400` errors); avatars on a mid-dark + teal palette; `color-scheme: dark`.

---

## [0.8.2] — 2026-07-05 — Teal accent + hero polish

### Changed
- **New accent — teal** (replacing indigo). Deep teal `#0f766e` for links / active /
  fills (readable as text), with a bright `#4CD1D6` pop in the logo hub, favicon and
  hero glow. Pure token swap in `globals.css`, so the whole app re-themed at once —
  black & white base + a single fresh accent (amber `#FFAB00` is a one-line alt).
- **Cleaner hero** — dropped the "فاز ۱ · شبکه‌ی داخلی سازمان" badge and the
  gradient-clipped headline word (rendered awkwardly in Persian); the accent word is
  now a solid, high-contrast teal.

### Fixed
- **Avatar initials** — Persian names rendered as two disjoint, wrong-joining-form
  letters (e.g. "اص"); avatars now use a single clean monogram letter, on a dark
  monochrome + teal palette (all dark enough for white text).

---

## [0.8.1] — 2026-07-05 — More data + sponsor profiles

### Added
- **Doubled the demo network** — ~23 members and ~21 projects across DevOps, ML,
  mobile, data, security, frontend, AI-agents, design, HR & finance (richer
  landing/directories).
- **Sponsor profiles** — `/u/[username]` now branches by role: a Sponsor shows a
  `Sponsor` badge and their open **opportunities** (with applicant counts) instead
  of the talent projects/stats. Dropped the non-functional follow-button stub.

---

## [0.8.0] — 2026-07-05 — Pro UI overhaul (monochrome + accent)

### Changed
- **New design language (tokens v3)** — Vercel / Linear / Stripe aesthetic:
  monochrome base (near-black `#0a0a0a`, off-white `#fafafa`, neutral grays),
  **black primary buttons**, a single electric-indigo accent used sparingly,
  hairline borders, tighter type. Token-driven, so a `globals.css` re-theme.
- **New logo** — a bolder, tech-driven black-squircle graph mark with white
  nodes and one electric accent hub (`LogoMark` + favicon). Accent period on the
  wordmark; refined avatar palette.
- **Refined navbar** — cleaner sticky bar, real-app login button.
- **Richer landing** — bold gradient hero + social-proof avatars, a hairline
  live-stats strip, a "why AIGraph" feature grid, how-it-works, a two-sided
  (builders / a black sponsors card) section, featured opportunities + challenges
  from the DB, and a black CTA band.

---

## [0.7.0] — 2026-07-05 — Auth, roles & the opportunities loop

The product now has accounts and a working two-sided marketplace.

### Added
- **Authentication** — lightweight credential auth (email + password, no email
  sending, Node scrypt). Sessions (`sessions` table + httpOnly cookie),
  `getCurrentUser`/`requireUser`/`requireAdmin`, a `/login` page, and login state
  in the nav. Login is constant-time (no user-enumeration timing leak).
- **Roles** — `account_type` (`talent` | `sponsor`) + the `is_admin` flag.
- **Admin panel** (`/admin`, admin-gated) — create users by role, list users; the
  CHRO `/dashboard` is now admin-only.
- **Opportunities & applications** — Sponsors post opportunities (`/opportunities`
  + detail); Talent apply (optional attached project + note); applications move
  through a hiring funnel (applied → shortlisted → next call → accepted/rejected).
  Sponsors review applicants and update status; Talent track their applications.
- **Role-based home** (`/home`) — talent see an application tracker + open
  opportunities; sponsors get a post form + their opportunities.
- **Landing login button**; example seed (`db:seed:opps`): a sponsor, 3
  opportunities, 7 applications across every stage, and login-able demo accounts.

### Fixed
- Auth security review: constant-time login (user-enumeration). Opportunities
  review: idempotent apply (double-apply no longer 500s via
  `onConflictDoNothing`), attached-project ownership validation (no cross-user
  attach / FK crash), and accessible labels on the create-opportunity form.

---

## [0.6.0] — 2026-07-05 — CHRO dashboard (Week 6)

### Added
- **Org dashboard** at `/dashboard` (plan Week 6) — headline metrics (members,
  active/project-shipping members, projects, skill-verification rate), member
  composition (Builder/Domain Expert/Hybrid), skill-distribution and AI-tool-
  adoption bar charts (`BarList`, plain CSS — no chart lib), and a top-builders
  leaderboard. Read-only aggregates in `lib/db/queries/dashboard.ts`.
  > To be admin-gated once auth (Week 2) lands; public for now.

---

## [0.5.1] — 2026-07-05 — Logo + landing polish

### Added
- **Logo mark** — a graph-of-nodes glyph that reads as an "A" (AIGraph), in the
  indigo→violet gradient (`LogoMark`); used in the nav, hero, footer, and as the
  favicon (`app/icon.svg`).
- **Redesigned landing** — logo hero, "چطور کار می‌کند" (how-it-works) flow,
  featured active-challenges section (from the DB), and a global site **Footer**.

---

## [0.5.0] — 2026-07-05 — Light redesign + directory filters

### Changed
- **New high-tech LIGHT theme** (design tokens v2). Indigo (`#4f46e5`) accent,
  emerald (`#059669`) for verified/shipped, Apple-gray canvas (`#f5f6f8`), white
  cards with soft shadows + hover lift, rounder corners, frosted-glass nav,
  gradient hero. Fonts unchanged (Vazirmatn). Because the whole app is token-
  driven, this was mostly a re-theme of `app/globals.css` plus flipping the
  ~60 `text-white`-type literals that don't auto-follow tokens.
  > Supersedes the dark-only palette in `DESIGN_SYSTEMV1.1.md` (that doc predates
  > this redesign and needs a v2 pass).

### Added
- **Directory filter & search** (plan Week 5): URL-driven skill/AI-tool chips,
  text search (debounced), and a sort control on Projects — server-rendered, no
  client fetching (`DirectoryFilters`, `getFilterFacets`, `escapeLike`). Seed now
  populates `project_skills` so project skill-filtering works.

### Fixed
- Filter-feature review (7 findings): search input no longer drops characters
  mid-type (URL sync only on external change); debounce cleared on unmount and on
  clear-all; per-directory facet sets (no dead chips); `ai_tool` skills excluded
  from skill chips; inputs get the §5.2 focus background.

---

## [0.4.0] — 2026-07-05 — Live product: landing, nav & directories

The app is now a browsable product, not just isolated profile URLs.

### Added
- **Landing page** (`/`) with the wordmark hero, tagline, both-personas framing,
  and live platform stats (members / projects / challenges / verified skills).
- **Top navigation** (`components/layout/Nav.tsx` + `Logo`) on every page —
  People / Projects / Challenges, with active state + `aria-current`.
- **People directory** (`/people`) — member cards (avatar, role badge, top skills);
  the system admin account is excluded.
- **Projects directory** (`/projects`) + **project detail** (`/projects/[id]`) —
  stage, owner, skills, AI tools, GitHub/demo links, and linked challenge problems.
- **Challenges directory** (`/challenges`) + **challenge detail** (`/challenges/[slug]`)
  — problems with a **Spotlight** badge and the **"Domain experts in this area"**
  matchmaking grid (plan §3.5).
- Query modules `stats.ts`, `projects.ts`, `challenges.ts`, and `getPeopleDirectory`.
- Shared atoms: `EmptyState`, `AiToolTag`, `SpotlightBadge`.
- Expanded demo seed (`db:seed:demo`): ~11 members across all personas, 10 projects
  (several linked to challenge problems), and one spotlighted problem.

### Fixed
- Hardened via a second 6-dimension adversarial review (10 findings): challenge
  project-counts now tally only published projects via active problems; excluded
  handle-less owners from project/expert links (no `/u/null`); domain-expert
  ordering is years-desc **nulls-last** then last-active; removed off-scale
  `py-24`/`size-40` and the nav `backdrop-blur` (anti-pattern §9); fixed h1→h3
  heading skips on list pages; added `aria-current` to the nav.

---

## [0.3.0] — 2026-07-05 — DB-backed profiles

The public profile is now served dynamically from Postgres.

### Added
- Dynamic route `app/u/[username]` — an async server component that reads a full
  profile from the database (`force-dynamic`), with a proper **404** for unknown
  users (`not-found.tsx`) and `generateMetadata` for the page title.
- Query layer `lib/db/queries/users.ts` — `getProfileByUsername()` assembles user
  + skills + domain expertise + published projects + computed stats; wrapped in
  React `cache()` so metadata and render share one fetch per request.
- `computeRoleBadge()` (`lib/users/role-badge.ts`) → Builder / Domain Expert /
  Hybrid, with a Node built-in test (`node --test`, 6 cases).
- Components: `ProfileSkills` (skills grouped by category, all shown with verified
  markers), `StageBadge` (all 5 project stages), `RoleBadge`, `DomainExpertiseList`,
  and `toFaDigits` (Persian numerals).
- Demo seed `scripts/seed-demo.ts` (`npm run db:seed:demo`, idempotent):
  sara-karimi (Builder), maryam-rezaei (Domain Expert), ali-mohammadi (Hybrid).

### Changed
- Replaced the hardcoded `app/u/sara-karimi` page with the dynamic route.
- `ProjectCard` uses `StageBadge` and renders upvotes in Persian numerals.

### Fixed
- Hardened via a 6-dimension adversarial review (11 findings): forbidden `py-10`
  spacing, double DB fetch per request, non-deterministic skill ordering, verified
  skills hidden behind a `+N` chip, Western-digit upvotes, `h2→h4` heading skip,
  React key on non-unique name, off-scale icon sizes, avatar accessibility.
- **Railway build:** removed `vitest` — its `esbuild@0.28.1` optional platform
  packages made npm's `npm ci` fail (`EBADPLATFORM` on `@esbuild/aix-ppc64`) on
  the Railway builder. Unit tests now run on Node's built-in runner.

---

## [0.2.0] — 2026-07-05 — Foundation (design tokens + database)

### Added
- **Design system in code:** full palette, type scale, and radius from
  `Repo/docs/DESIGN_SYSTEMV1.1.md` ported into a Tailwind v4 `@theme` block in
  `app/globals.css` (`bg-canvas`, `text-h1`, `border-border-subtle`, …). Class-based
  dark variant.
- **Database:** Drizzle ORM + `postgres` + drizzle-kit. Full plan schema in
  `lib/db/schema.ts` (20 tables, 13 enums, `org_id` scoping). Lazy DB client so
  `next build` never needs a live DB. First migration + idempotent taxonomy seed
  (`npm run db:seed`): org, 73 skills, 11 domains, 5 challenges, 10 problems, 3 badges.
- Railway **Postgres** service provisioned; `DATABASE_URL` wired into the web
  service over the private network.

### Changed
- All existing components refactored off raw hex onto design tokens.
- Fixed stale doc paths in `Repo/CLAUDE.md`.

---

## [0.1.0] — 2026-07-05 — Next.js scaffold + first deploy

### Added
- Next.js 15 (App Router) + TypeScript + Tailwind v4 scaffold; root layout with
  Persian/RTL + self-hosted Vazirmatn (`next/font`). Root `/` redirects to the demo
  profile.
- Deployed to Railway (project `talenthub`).

### Fixed
- Pinned `next@^15.5.20` (15.1.6 carried a CVE); aligned Tailwind v4 packages
  (`tailwindcss` / `@tailwindcss/postcss` / `@tailwindcss/oxide`) to avoid the
  "Missing field `negated`" build error.

[0.3.0]: https://github.com/ashibnak/TalentHub/commits/main
[0.2.0]: https://github.com/ashibnak/TalentHub/commits/main
[0.1.0]: https://github.com/ashibnak/TalentHub/commits/main
