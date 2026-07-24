---
name: run-local
description: Launch and drive the AIGraph Next.js app locally (Postgres-backed dev server on :3000) — use when asked to run, start, or smoke-test the app on this machine.
---

# Run AIGraph locally

Next.js 15 (App Router) + Drizzle + PostgreSQL. **Every route is DB-backed and
`force-dynamic`**, so the app needs a live `DATABASE_URL` or pages return 500
("DATABASE_URL is not set"). Booting `next dev` without a database is not a
successful run.

## Prerequisites

- `node_modules` installed (`npm ci` if missing).
- A reachable PostgreSQL and a `DATABASE_URL` in `.env.local`. A local Postgres
  (e.g. the PostgreSQL 18 service on `localhost:5432`) works; the connection
  string lives in `.env.local` (gitignored) as:
  `DATABASE_URL=postgresql://<user>:<pass>@localhost:5432/aigraph`
  Do not hardcode credentials anywhere tracked — keep them in `.env.local`.

## One-time setup (fresh database)

Run from the repo root (`C:\Users\ashka\Desktop\AiTalentGraph`).

1. **Create the database** (once). Using a superuser connection to the default
   `postgres` database, `CREATE DATABASE aigraph` if it doesn't already exist
   (CREATE DATABASE can't run inside a transaction — issue it directly).
2. **Set `DATABASE_URL`** in `.env.local` pointing at that `aigraph` database.
3. **Migrate**: `npm run db:migrate` (applies `lib/db/migrations/0000…` in order).
4. **Seed** (order matters — demo needs base; leaderboard needs demo):
   - `npm run db:seed` — org, ~75 skills, 11 domains, 5 challenges, 10 problems, 3 badges
   - `npm run db:seed:demo` — ~23 members + projects (+ one spotlight)
   - `npm run db:seed:leaderboard` — current-week activity so `/leaderboard` is populated

Re-running any seed is idempotent.

## Launch + drive

- Start (background): `npm run dev` → serves on `http://localhost:3000` (reads `.env.local`).
- Wait for `✓ Ready` in the output, then smoke-test:
  ```bash
  for p in / /projects /leaderboard /people /challenges; do
    curl -s -o /dev/null -w "$p -> %{http_code}\n" --max-time 60 "http://localhost:3000$p"
  done
  ```
  All should be `200`. `/leaderboard` should show seeded names (e.g. کاوه جعفری,
  علی محمدی), not the empty state.
- The word "error" in page HTML is Next.js dev's error-overlay script (a false
  positive). A real RSC failure returns **500**, not 200 — check the dev-server
  output for `⨯` / `Error:` lines to distinguish.

## Notes

- **Auth**: demo users are seeded without passwords, so authenticated flows
  (upvote, project submission) need a real login first — create an admin with
  `npm run admin:set`, or insert a user with a password hash.
- Harmless startup warning: Next may pick `C:\Users\ashka\package-lock.json` as
  the workspace root (a stray lockfile in the home dir). Silence later via
  `outputFileTracingRoot` in `next.config.ts` if desired.
- Type-check without the stale `Repo/` scaffold:
  `npx tsc --noEmit 2>&1 | grep -E "^(app|lib|components|scripts)/" | grep -v "^Repo/"`.
