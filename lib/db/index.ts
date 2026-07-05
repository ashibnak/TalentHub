import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/**
 * Lazy DB singleton. The connection is created on first `getDb()` call, not at
 * import time — so `next build` and modules that only import types never require
 * a live DATABASE_URL. postgres.js opens the socket lazily on the first query.
 */
let _db: PostgresJsDatabase<typeof schema> | undefined;

export function getDb(): PostgresJsDatabase<typeof schema> {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set — cannot connect to Postgres.');
  }
  const client = postgres(url, { prepare: false });
  _db = drizzle({ client, schema });
  return _db;
}

export { schema };
