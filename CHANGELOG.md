# Changelog

All notable changes to **AIGraph** (TalentHub) are documented here.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/); dates are ISO‑8601.

Live: <https://talenthub-production-3507.up.railway.app>

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
