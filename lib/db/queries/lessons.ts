import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { getDb } from '@/lib/db';
import { lessons } from '@/lib/db/schema';
import type { Lesson } from '@/lib/lessons/rules';

/**
 * The whole lesson pool, cross-request cached.
 *
 * Small, immutable between seeds, and read on every sign-in — so it is cached
 * for an hour under a 'lessons' tag rather than queried per page view.
 * Selection itself is pure (lib/lessons/rules.ts).
 */
const getCachedLessons = unstable_cache(
  async (): Promise<Lesson[]> =>
    getDb()
      .select({
        slug: lessons.slug,
        provider: lessons.provider,
        title: lessons.title,
        description: lessons.description,
        url: lessons.url,
        kind: lessons.kind,
        level: lessons.level,
        topics: lessons.topics,
        audience: lessons.audience,
        durationMinutes: lessons.durationMinutes,
      })
      .from(lessons),
  ['lessons-pool'],
  { revalidate: 3600, tags: ['lessons'] },
);

/** Every lesson. Returns [] on failure so the block renders nothing. */
export const getLessonPool = cache(async (): Promise<Lesson[]> => {
  try {
    return await getCachedLessons();
  } catch (err) {
    console.error('[home.lessons] could not load the lesson pool', err);
    return [];
  }
});
