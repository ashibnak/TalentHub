import { cache } from 'react';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { orgs } from '@/lib/db/schema';

/**
 * Phase 1 is a single organization; every query scopes to this slug (see
 * CODE_CONVENTIONS §4). This is the one place the constant and the id lookup
 * live — import from here rather than re-deriving them per module.
 */
export const MAIN_ORG_SLUG = 'main-org';

/** The main org's id (request-scoped cached), or null if it isn't seeded yet. */
export const getMainOrgId = cache(async (): Promise<string | null> => {
  const [org] = await getDb().select({ id: orgs.id }).from(orgs).where(eq(orgs.slug, MAIN_ORG_SLUG)).limit(1);
  return org?.id ?? null;
});
