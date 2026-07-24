import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { getDb } from '@/lib/db';

// Health probe: confirms the process is up AND Postgres is reachable, so Railway
// (or any monitor) can tell "booted" from "DB down". No auth — returns no data.
// Follows the API-route error pattern in CODE_CONVENTIONS §3.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await getDb().execute(sql`select 1`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[health.check]', err);
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
