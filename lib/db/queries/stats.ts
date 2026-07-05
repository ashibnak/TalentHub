import { cache } from 'react';
import { and, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { users, projects, challenges, userSkills } from '@/lib/db/schema';

export type PlatformStats = {
  members: number;
  projects: number;
  challenges: number;
  verifiedSkills: number;
};

/** Aggregate counts for the landing page. */
export const getPlatformStats = cache(async (): Promise<PlatformStats> => {
  const db = getDb();
  const [members, projectCount, challengeCount, verifiedSkills] = await Promise.all([
    db.$count(users, and(eq(users.isAdmin, false), eq(users.status, 'active'))),
    db.$count(projects, eq(projects.status, 'published')),
    db.$count(challenges, eq(challenges.status, 'active')),
    db.$count(userSkills, eq(userSkills.verified, true)),
  ]);
  return { members, projects: projectCount, challenges: challengeCount, verifiedSkills };
});
