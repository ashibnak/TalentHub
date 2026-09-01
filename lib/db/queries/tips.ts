import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { getDb } from '@/lib/db';
import { tips } from '@/lib/db/schema';
import type { Tip } from '@/lib/tips/rules';

/**
 * The whole tip pool, cross-request cached.
 *
 * The pool is small (~90 rows), immutable between seeds, and read on every
 * sign-in, so it is cached for an hour under a 'tips' tag rather than queried
 * per page view. Selection itself is pure and happens in lib/tips/rules.ts.
 */
const getCachedTips = unstable_cache(
  async (): Promise<Tip[]> => {
    const rows = await getDb()
      .select({
        slug: tips.slug,
        category: tips.category,
        audience: tips.audience,
        title: tips.title,
        body: tips.body,
      })
      .from(tips);
    return rows;
  },
  ['tips-pool'],
  { revalidate: 3600, tags: ['tips'] },
);

/** Every tip. Returns [] on failure so the block renders nothing. */
export const getTipPool = cache(async (): Promise<Tip[]> => {
  try {
    return await getCachedTips();
  } catch (err) {
    console.error('[home.tips] could not load the tip pool', err);
    return [];
  }
});
