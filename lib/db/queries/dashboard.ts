import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { and, count, countDistinct, desc, eq, isNotNull } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { users, skills, userSkills, projects, projectAiTools } from '@/lib/db/schema';
import { getPeopleDirectory } from '@/lib/db/queries/users';
import { aiToolLabel } from '@/lib/ai-tools';
import type { RoleBadge } from '@/lib/users/role-badge';

export type DashboardMetrics = {
  totalMembers: number;
  activeMembers: number; // have shipped ≥1 published project
  totalProjects: number;
  verificationRate: number; // 0–100
  roleDistribution: Record<RoleBadge, number>;
  skillDistribution: { label: string; value: number }[];
  toolAdoption: { label: string; value: number }[];
  topBuilders: { username: string; name: string; projectCount: number }[];
};

/** Org-wide metrics for the CHRO dashboard (plan Week 6), read-only aggregates.
 *  Cross-request cached (60s); the return value is fully JSON-safe (no Dates). */
export const getDashboardMetrics = cache(
  unstable_cache(
    async (): Promise<DashboardMetrics> => {
      const db = getDb();
  const people = await getPeopleDirectory(); // members with computed role_badge

  const [totalProjects, verifiedSkills, totalSkills, activeRows, skillDist, toolDist, builderRows] = await Promise.all([
    db.$count(projects, eq(projects.status, 'published')),
    db.$count(userSkills, eq(userSkills.verified, true)),
    db.$count(userSkills),
    db.selectDistinct({ id: projects.userId }).from(projects).where(eq(projects.status, 'published')),
    db
      .select({ label: skills.name, value: countDistinct(userSkills.userId) })
      .from(userSkills)
      .innerJoin(skills, eq(userSkills.skillId, skills.id))
      .groupBy(skills.id, skills.name)
      .orderBy(desc(countDistinct(userSkills.userId)), skills.name)
      .limit(12),
    db
      .select({ slug: projectAiTools.toolSlug, value: countDistinct(projectAiTools.projectId) })
      .from(projectAiTools)
      .groupBy(projectAiTools.toolSlug)
      .orderBy(desc(countDistinct(projectAiTools.projectId)), projectAiTools.toolSlug)
      .limit(8),
    db
      .select({ username: users.username, name: users.name, projectCount: count(projects.id) })
      .from(users)
      .innerJoin(projects, and(eq(projects.userId, users.id), eq(projects.status, 'published')))
      .where(and(eq(users.isAdmin, false), isNotNull(users.username)))
      .groupBy(users.id, users.username, users.name)
      .orderBy(desc(count(projects.id)))
      .limit(10),
  ]);

  const roleDistribution: Record<RoleBadge, number> = { builder: 0, domain_expert: 0, hybrid: 0 };
  for (const p of people) roleDistribution[p.roleBadge] += 1;

  return {
    totalMembers: people.length,
    activeMembers: activeRows.length,
    totalProjects,
    verificationRate: totalSkills > 0 ? Math.round((verifiedSkills / totalSkills) * 100) : 0,
    roleDistribution,
    skillDistribution: skillDist.map((s) => ({ label: s.label, value: Number(s.value) })),
    toolAdoption: toolDist.map((t) => ({ label: aiToolLabel(t.slug), value: Number(t.value) })),
    topBuilders: builderRows.map((b) => ({ username: b.username!, name: b.name, projectCount: Number(b.projectCount) })),
  };
    },
    ['dashboard-metrics'],
    { revalidate: 60, tags: ['dashboard-metrics'] },
  ),
);
