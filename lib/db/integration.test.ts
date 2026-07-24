/**
 * DB integration tests — real Postgres, not unit logic. Run with `npm run test:db`
 * (NOT part of `npm test`). Each suite spins up a throwaway `test_*` database,
 * applies the real migrations, exercises the code, then drops it. Requires a
 * DATABASE_URL whose role may CREATE DATABASE (the CI postgres service, or a
 * local superuser). Skipped with a clear message when DATABASE_URL is unset.
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '@/lib/db/schema';
import { applyUpvoteToggle } from '@/lib/upvotes/toggle';
import { freezeWeek } from '@/lib/db/queries/leaderboard';
import { weekWindow } from '@/lib/leaderboard/scoring';

type Sql = ReturnType<typeof postgres>;
const ADMIN_URL = process.env.DATABASE_URL;

const withDb = (base: string, name: string): string => {
  const u = new URL(base);
  u.pathname = '/' + name;
  return u.toString();
};

const JOURNAL = JSON.parse(readFileSync('lib/db/migrations/meta/_journal.json', 'utf8')) as {
  entries: { idx: number; tag: string }[];
};

/** Apply migration SQL files with idx in [minIdx, maxIdx], in order. */
async function applyMigrations(client: Sql, minIdx: number, maxIdx: number): Promise<void> {
  const entries = JOURNAL.entries.filter((e) => e.idx >= minIdx && e.idx <= maxIdx).sort((a, b) => a.idx - b.idx);
  for (const e of entries) {
    const file = readFileSync(`lib/db/migrations/${e.tag}.sql`, 'utf8');
    for (const stmt of file.split('--> statement-breakpoint')) {
      const s = stmt.trim();
      if (s) await client.unsafe(s);
    }
  }
}

async function dropDb(admin: Sql, name: string): Promise<void> {
  await admin.unsafe(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${name}' AND pid <> pg_backend_pid()`);
  await admin.unsafe(`DROP DATABASE IF EXISTS ${name}`);
}

const suite = ADMIN_URL ? describe : describe.skip;
if (!ADMIN_URL) console.warn('\n[test:db] DATABASE_URL is not set — skipping DB integration tests.\n');

suite('upvote invariant + freeze idempotency', () => {
  const dbName = `test_aigraph_${Date.now()}`;
  let admin: Sql;
  let testSql: Sql;
  let testDb: ReturnType<typeof drizzle<typeof schema>>;
  let ids: { orgId: string; userA: string; userB: string; projectId: string };

  before(async () => {
    admin = postgres(withDb(ADMIN_URL!, 'postgres'), { max: 1 });
    await admin.unsafe(`CREATE DATABASE ${dbName}`);
    const scratchUrl = withDb(ADMIN_URL!, dbName);
    process.env.DATABASE_URL = scratchUrl; // binds getDb() used inside freezeWeek
    testSql = postgres(scratchUrl, { max: 5 });
    testDb = drizzle(testSql, { schema });
    await applyMigrations(testSql, 0, Number.MAX_SAFE_INTEGER);

    const [org] = await testSql`INSERT INTO orgs (name, slug) VALUES ('Test Org', 'main-org') RETURNING id`;
    const [uA] = await testSql`INSERT INTO users (org_id, email, name, username, status, is_admin)
      VALUES (${org.id}, 'a@test.local', 'Alpha', 'builder-a', 'active', false) RETURNING id`;
    const [uB] = await testSql`INSERT INTO users (org_id, email, name, username, status, is_admin)
      VALUES (${org.id}, 'b@test.local', 'Beta', 'voter-b', 'active', false) RETURNING id`;
    const [proj] = await testSql`INSERT INTO projects (user_id, title, description, status)
      VALUES (${uA.id}, 'Alpha Project', 'A sufficiently long description.', 'published') RETURNING id`;
    ids = { orgId: org.id, userA: uA.id, userB: uB.id, projectId: proj.id };
  });

  after(async () => {
    await testSql?.end({ timeout: 5 });
    await dropDb(admin, dbName);
    await admin?.end({ timeout: 5 });
  });

  it('keeps upvote_count === row count under a concurrent double-toggle', async () => {
    await Promise.all([
      applyUpvoteToggle(testDb, ids.userB, ids.projectId),
      applyUpvoteToggle(testDb, ids.userB, ids.projectId),
    ]);
    const [{ denorm }] = await testSql`SELECT upvote_count AS denorm FROM projects WHERE id = ${ids.projectId}`;
    const [{ actual }] = await testSql`SELECT count(*)::int AS actual FROM project_upvotes WHERE project_id = ${ids.projectId}`;
    assert.equal(Number(denorm), Number(actual)); // the invariant: no drift
    assert.ok(Number(actual) <= 1); // a single user can hold at most one upvote
  });

  it('freezeWeek is idempotent — identical snapshots, one badge per winner', async () => {
    const window = weekWindow(0);
    const snapshotRows = () =>
      testSql`SELECT user_id, group_type, rank, score FROM leaderboard_snapshots
              WHERE org_id = ${ids.orgId} ORDER BY group_type, rank`;
    const badgeCount = () =>
      testSql`SELECT count(*)::int AS n FROM user_badges ub
              JOIN badges b ON b.id = ub.badge_id WHERE b.slug = 'top-of-the-week'`;

    const first = await freezeWeek(window);
    const rows1 = await snapshotRows();
    const [{ n: badges1 }] = await badgeCount();

    const second = await freezeWeek(window);
    const rows2 = await snapshotRows();
    const [{ n: badges2 }] = await badgeCount();

    assert.ok(first.winners.length >= 1, 'expected at least one winner');
    assert.deepEqual(rows2, rows1); // second freeze reproduces the first exactly
    assert.equal(Number(badges2), Number(badges1)); // re-running never duplicates badges
    assert.equal(Number(badges1), first.winners.length); // one badge per winner
    assert.deepEqual(second.winners, first.winners);
  });
});

suite('migration 0007 backfill', () => {
  const dbName = `test_aigraph_mig_${Date.now()}`;
  let admin: Sql;
  let sql: Sql;

  before(async () => {
    admin = postgres(withDb(ADMIN_URL!, 'postgres'), { max: 1 });
    await admin.unsafe(`CREATE DATABASE ${dbName}`);
    sql = postgres(withDb(ADMIN_URL!, dbName), { max: 1 });
    await applyMigrations(sql, 0, 6); // schema at 0006 — submission_notes still present
  });

  after(async () => {
    await sql?.end({ timeout: 5 });
    await dropDb(admin, dbName);
    await admin?.end({ timeout: 5 });
  });

  it('copies submission_notes into the new solution_description column', async () => {
    const [org] = await sql`INSERT INTO orgs (name, slug) VALUES ('O', 'o-slug') RETURNING id`;
    const [u] = await sql`INSERT INTO users (org_id, email, name) VALUES (${org.id}, 'u@test.local', 'U') RETURNING id`;
    const [ch] = await sql`INSERT INTO challenges (org_id, slug, title, description)
      VALUES (${org.id}, 'c-slug', 'C', 'desc') RETURNING id`;
    const [pr] = await sql`INSERT INTO challenge_problems (challenge_id, title, description)
      VALUES (${ch.id}, 'P', 'pdesc') RETURNING id`;
    const [proj] = await sql`INSERT INTO projects (user_id, title, description)
      VALUES (${u.id}, 'Proj', 'pdesc') RETURNING id`;
    await sql`INSERT INTO project_challenge_problems (project_id, challenge_problem_id, submission_notes)
      VALUES (${proj.id}, ${pr.id}, 'carry me over')`;

    await applyMigrations(sql, 7, 7); // apply ONLY 0007

    const [row] = await sql`SELECT solution_description, ip_terms_accepted_at, created_at
                            FROM project_challenge_problems WHERE project_id = ${proj.id}`;
    assert.equal(row.solution_description, 'carry me over'); // backfilled, not lost
    assert.deepEqual(row.ip_terms_accepted_at, row.created_at); // accepted-at backfilled from created_at
  });
});
