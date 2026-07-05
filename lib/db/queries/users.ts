import { cache } from 'react';
import { and, desc, eq, ilike, inArray, isNotNull, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import {
  users,
  skills,
  userSkills,
  domains,
  userDomainExpertise,
  projects,
  projectAiTools,
  userBadges,
} from '@/lib/db/schema';
import { escapeLike } from '@/lib/db/queries/filters';
import { computeRoleBadge, type RoleBadge } from '@/lib/users/role-badge';
import type { BuildingStatus } from '@/components/atoms/StatusPill';
import type { ProjectStage } from '@/components/atoms/StageBadge';

export type ProfileSkill = {
  slug: string;
  name: string;
  category: 'language' | 'framework' | 'tool' | 'concept' | 'ai_tool';
  claimedLevel: number;
  verified: boolean;
};

export type ProfileDomain = {
  slug: string;
  name: string;
  yearsExperience: number | null;
};

export type ProfileProject = {
  id: string;
  title: string;
  description: string;
  stage: ProjectStage;
  upvoteCount: number;
};

export type Profile = {
  id: string;
  username: string;
  name: string;
  roleTitle: string | null;
  bio: string | null;
  avatarUrl: string | null;
  githubUsername: string | null;
  linkedinUrl: string | null;
  roleBadge: RoleBadge;
  buildingStatus: BuildingStatus;
  skills: ProfileSkill[];
  domains: ProfileDomain[];
  projects: ProfileProject[];
  stats: {
    projectCount: number;
    verifiedSkillCount: number;
    badgeCount: number;
    upvotesReceived: number;
  };
};

/** Derived building status (plan §2). Placeholder until GitHub activity polling
 *  (Week 7) provides real commit/release timestamps — for now, inferred from the
 *  most active project stage. */
function deriveBuildingStatus(stages: ProjectStage[]): BuildingStatus {
  if (stages.includes('building')) return 'building';
  if (stages.some((s) => s === 'shipped' || s === 'maintained')) return 'shipped';
  return 'idle';
}

/**
 * Full public profile for /u/[username]. Returns null if the username doesn't
 * exist. Phase 1 is single-org, so the username (globally unique) is a
 * sufficient key; org scoping becomes a filter here in phase 2.
 */
// Wrapped in React's request-scoped cache() so generateMetadata and the page
// component share ONE result per request instead of each re-hitting Postgres.
export const getProfileByUsername = cache(async (username: string): Promise<Profile | null> => {
  const db = getDb();

  const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
  if (!user || !user.username) return null;

  const [skillRows, domainRows, projectRows, badgeCountRows] = await Promise.all([
    db
      .select({
        slug: skills.slug,
        name: skills.name,
        category: skills.category,
        claimedLevel: userSkills.claimedLevel,
        verified: userSkills.verified,
      })
      .from(userSkills)
      .innerJoin(skills, eq(userSkills.skillId, skills.id))
      .where(eq(userSkills.userId, user.id))
      // Deterministic order: verified first, then higher claimed level, then name.
      .orderBy(desc(userSkills.verified), desc(userSkills.claimedLevel), skills.name),
    db
      .select({
        slug: domains.slug,
        name: domains.name,
        yearsExperience: userDomainExpertise.yearsExperience,
      })
      .from(userDomainExpertise)
      .innerJoin(domains, eq(userDomainExpertise.domainId, domains.id))
      .where(eq(userDomainExpertise.userId, user.id)),
    db
      .select({
        id: projects.id,
        title: projects.title,
        description: projects.description,
        stage: projects.stage,
        upvoteCount: projects.upvoteCount,
      })
      .from(projects)
      .where(and(eq(projects.userId, user.id), eq(projects.status, 'published')))
      .orderBy(desc(projects.upvoteCount)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(userBadges)
      .where(eq(userBadges.userId, user.id)),
  ]);

  // Sort domains by experience desc, nulls last (kept in JS for null control).
  const sortedDomains = [...domainRows].sort(
    (a, b) => (b.yearsExperience ?? -1) - (a.yearsExperience ?? -1),
  );

  const technicalSkillCount = skillRows.filter((s) => s.category !== 'ai_tool').length;
  const verifiedSkillCount = skillRows.filter((s) => s.verified).length;
  const upvotesReceived = projectRows.reduce((sum, p) => sum + p.upvoteCount, 0);

  return {
    id: user.id,
    username: user.username,
    name: user.name,
    roleTitle: user.roleTitle,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    githubUsername: user.githubUsername,
    linkedinUrl: user.linkedinUrl,
    roleBadge: computeRoleBadge({ technicalSkillCount, domainCount: sortedDomains.length }),
    buildingStatus: deriveBuildingStatus(projectRows.map((p) => p.stage)),
    skills: skillRows,
    domains: sortedDomains,
    projects: projectRows,
    stats: {
      projectCount: projectRows.length,
      verifiedSkillCount,
      badgeCount: badgeCountRows[0]?.count ?? 0,
      upvotesReceived,
    },
  };
});

export type DirectoryUser = {
  username: string;
  name: string;
  roleTitle: string | null;
  roleBadge: RoleBadge;
  topSkills: { slug: string; name: string; verified: boolean }[];
};

/**
 * People directory (plan Week 5). Real members only (active, non-admin, with a
 * username). Fetches users + their skills/domains in a fixed number of queries
 * (no N+1) and computes role_badge + top skills in JS.
 */
export type PeopleFilters = { q?: string; skills?: string[]; tools?: string[] };

export const getPeopleDirectory = cache(async (filters: PeopleFilters = {}): Promise<DirectoryUser[]> => {
  const db = getDb();

  const conditions = [eq(users.status, 'active'), eq(users.isAdmin, false), isNotNull(users.username)];
  const q = filters.q?.trim();
  if (q) conditions.push(ilike(users.name, `%${escapeLike(q)}%`));
  if (filters.skills?.length) {
    conditions.push(
      inArray(
        users.id,
        db.select({ id: userSkills.userId }).from(userSkills).innerJoin(skills, eq(userSkills.skillId, skills.id)).where(inArray(skills.slug, filters.skills)),
      ),
    );
  }
  if (filters.tools?.length) {
    conditions.push(
      inArray(
        users.id,
        db
          .selectDistinct({ id: projects.userId })
          .from(projects)
          .innerJoin(projectAiTools, eq(projectAiTools.projectId, projects.id))
          .where(and(eq(projects.status, 'published'), inArray(projectAiTools.toolSlug, filters.tools))),
      ),
    );
  }

  const userRows = await db
    .select({ id: users.id, username: users.username, name: users.name, roleTitle: users.roleTitle })
    .from(users)
    .where(and(...conditions))
    .orderBy(users.name);
  if (userRows.length === 0) return [];

  const ids = userRows.map((u) => u.id);
  const [skillRows, domainRows] = await Promise.all([
    db
      .select({
        userId: userSkills.userId,
        slug: skills.slug,
        name: skills.name,
        category: skills.category,
        verified: userSkills.verified,
      })
      .from(userSkills)
      .innerJoin(skills, eq(userSkills.skillId, skills.id))
      .where(inArray(userSkills.userId, ids))
      .orderBy(desc(userSkills.verified), desc(userSkills.claimedLevel), skills.name),
    db
      .select({ userId: userDomainExpertise.userId })
      .from(userDomainExpertise)
      .where(inArray(userDomainExpertise.userId, ids)),
  ]);

  const domainCountByUser = new Map<string, number>();
  for (const d of domainRows) domainCountByUser.set(d.userId, (domainCountByUser.get(d.userId) ?? 0) + 1);

  return userRows.map((u) => {
    const userSkillRows = skillRows.filter((s) => s.userId === u.id);
    const technicalSkillCount = userSkillRows.filter((s) => s.category !== 'ai_tool').length;
    return {
      username: u.username!,
      name: u.name,
      roleTitle: u.roleTitle,
      roleBadge: computeRoleBadge({ technicalSkillCount, domainCount: domainCountByUser.get(u.id) ?? 0 }),
      topSkills: userSkillRows.slice(0, 3).map((s) => ({ slug: s.slug, name: s.name, verified: s.verified })),
    };
  });
});
