# Changelog

All notable changes to **AIGraph** (TalentHub) are documented here.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/); dates are ISO‑8601.

Live: <https://talenthub-production-3507.up.railway.app>

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
