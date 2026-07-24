import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { users, projects, challenges, userSkills } from '@/lib/db/schema';

export type PlatformStats = {
  members: number;
  projects: number;
  challenges: number;
  verifiedSkills: number;
};

/**
 * Aggregate counts for the landing page. Cross-request cached (60s) since these
 * change slowly; the outer React cache dedups within a single render.
 */
export const getPlatformStats = cache(
  unstable_cache(
    async (): Promise<PlatformStats> => {
      const db = getDb();
      const [members, projectCount, challengeCount, verifiedSkills] = await Promise.all([
        db.$count(users, and(eq(users.isAdmin, false), eq(users.status, 'active'))),
        db.$count(projects, eq(projects.status, 'published')),
        db.$count(challenges, eq(challenges.status, 'active')),
        db.$count(userSkills, eq(userSkills.verified, true)),
      ]);
      return { members, projects: projectCount, challenges: challengeCount, verifiedSkills };
    },
    ['platform-stats'],
    { revalidate: 60, tags: ['platform-stats'] },
  ),
);
