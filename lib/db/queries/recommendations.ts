import { cache } from 'react';
import { and, desc, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { domains, projectSkills, projects, skills, userDomainExpertise, userSkills, verificationRuns } from '@/lib/db/schema';
import { VERIFICATION_CONFIDENCE_THRESHOLD, type VerifySkillsOutput } from '@/lib/verification/rules';
import type { RoleBadge } from '@/lib/users/role-badge';
import type { UserSignals } from '@/lib/recommendations/rules';

/**
 * Gather every personalisation signal for one member, in one place.
 *
 * Four small indexed queries in parallel. Returns empty signals rather than
 * throwing, so the recommendations block degrades to rendering nothing.
 */
export const getUserSignals = cache(async (userId: string, role: RoleBadge): Promise<UserSignals> => {
  const db = getDb();

  const [skillRows, domainRows, projectSkillRows, runRows] = await Promise.all([
    db
      .select({ slug: skills.slug, claimedLevel: userSkills.claimedLevel, verified: userSkills.verified })
      .from(userSkills)
      .innerJoin(skills, eq(userSkills.skillId, skills.id))
      .where(eq(userSkills.userId, userId)),

    db
      .select({ slug: domains.slug })
      .from(userDomainExpertise)
      .innerJoin(domains, eq(userDomainExpertise.domainId, domains.id))
      .where(eq(userDomainExpertise.userId, userId)),

    db
      .selectDistinct({ slug: skills.slug })
      .from(projectSkills)
      .innerJoin(projects, eq(projectSkills.projectId, projects.id))
      .innerJoin(skills, eq(projectSkills.skillId, skills.id))
      .where(eq(projects.userId, userId)),

    // Recent successful runs — the source of "we could not evidence X".
    db
      .select({ output: verificationRuns.output })
      .from(verificationRuns)
      .where(and(eq(verificationRuns.userId, userId), eq(verificationRuns.status, 'success')))
      .orderBy(desc(verificationRuns.createdAt))
      .limit(5),
  ]);

  // Every skill a run judged below threshold — the platform's own unmet promise.
  const verificationGaps = new Set<string>();
  for (const row of runRows) {
    const output = row.output as unknown as VerifySkillsOutput | null;
    for (const v of output?.verifications ?? []) {
      if (v.confidence < VERIFICATION_CONFIDENCE_THRESHOLD) verificationGaps.add(v.skill_slug);
    }
  }

  return {
    role,
    skills: skillRows,
    domains: domainRows.map((r) => r.slug),
    projectSkills: projectSkillRows.map((r) => r.slug),
    verificationGaps: [...verificationGaps],
  };
});
