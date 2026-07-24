import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/**
 * Lazy DB singleton. The connection is created on first `getDb()` call, not at
 * import time — so `next build` and modules that only import types never require
 * a live DATABASE_URL. postgres.js opens the socket lazily on the first query.
 *
 * In development the client is stashed on `globalThis` so Next's hot-reload
 * (which re-evaluates this module) reuses ONE pool instead of leaking a new pool
 * on every reload — which otherwise exhausts Postgres `max_connections`
 * ("too many clients already"). `idle_timeout` also releases idle sockets.
 */
const globalForDb = globalThis as unknown as { _aigraphDb?: PostgresJsDatabase<typeof schema> };
let _db: PostgresJsDatabase<typeof schema> | undefined = globalForDb._aigraphDb;

export function getDb(): PostgresJsDatabase<typeof schema> {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set — cannot connect to Postgres.');
  }
  const client = postgres(url, { prepare: false, max: 10, idle_timeout: 20 });
  _db = drizzle({ client, schema });
  if (process.env.NODE_ENV !== 'production') globalForDb._aigraphDb = _db;
  return _db;
}

export { schema };
