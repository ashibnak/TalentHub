import { cache } from 'react';
import { and, desc, eq, inArray, isNotNull, ne, notInArray, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { challenges, ideaMembers, ideaMentors, ideas, lessons, orbitCourseOpens, projects, skills, userDomainExpertise, userSkills, users } from '@/lib/db/schema';
import { PUBLIC_IDEA_STATUS, type IdeaStatus } from '@/lib/ideas/rules';
import type { OrbitStage } from '@/lib/ideas/orbit';
import type { MentorRole } from '@/lib/ideas/mentors';
import { rankRecruitSuggestions } from '@/lib/ideas/recruit';
import { computeRoleBadge, type RoleBadge } from '@/lib/users/role-badge';
import type { IpTerms } from '@/lib/submissions/rules';

export type DirectoryIdea = {
  id: string;
  title: string;
  problemStatement: string;
  createdAt: Date;
  author: { name: string; username: string | null; roleBadge: RoleBadge };
  challenge: { slug: string; title: string } | null;
};

/**
 * role_badge is COMPUTED, never stored (plan §2). Two grouped counts for the
 * whole author set — not a per-card query — then computed in JS, matching how
 * the directory/profile queries already derive it.
 */
async function roleBadgesFor(userIds: string[]): Promise<Map<string, RoleBadge>> {
  if (userIds.length === 0) return new Map();
  const db = getDb();

  const [techRows, domainRows] = await Promise.all([
    db
      .select({ userId: userSkills.userId, n: sql<number>`count(*)::int` })
      .from(userSkills)
      .innerJoin(skills, eq(userSkills.skillId, skills.id))
      // ai_tool excluded: a Domain Expert who uses Cursor is still a Domain Expert.
      .where(and(inArray(userSkills.userId, userIds), ne(skills.category, 'ai_tool')))
      .groupBy(userSkills.userId),
    db
      .select({ userId: userDomainExpertise.userId, n: sql<number>`count(*)::int` })
      .from(userDomainExpertise)
      .where(inArray(userDomainExpertise.userId, userIds))
      .groupBy(userDomainExpertise.userId),
  ]);

  const tech = new Map(techRows.map((r) => [r.userId, Number(r.n)]));
  const domains = new Map(domainRows.map((r) => [r.userId, Number(r.n)]));
  return new Map(
    userIds.map((id) => [
      id,
      computeRoleBadge({ technicalSkillCount: tech.get(id) ?? 0, domainCount: domains.get(id) ?? 0 }),
    ]),
  );
}

/**
 * Public ideas directory — APPROVED only, newest first, optionally narrowed to
 * one challenge. Org-scoped per CODE_CONVENTIONS §4; the (org_id, status) index
 * covers the unfiltered case and (challenge_id, status) the filtered one.
 */
export const getIdeasDirectory = cache(
  async (orgId: string, challengeSlug?: string): Promise<DirectoryIdea[]> => {
    const db = getDb();

    const rows = await db
      .select({
        id: ideas.id,
        title: ideas.title,
        problemStatement: ideas.problemStatement,
        createdAt: ideas.createdAt,
        authorId: ideas.userId,
        authorName: users.name,
        authorUsername: users.username,
        challengeSlug: challenges.slug,
        challengeTitle: challenges.title,
      })
      .from(ideas)
      .innerJoin(users, eq(ideas.userId, users.id))
      .leftJoin(challenges, eq(ideas.challengeId, challenges.id))
      .where(
        and(
          eq(ideas.orgId, orgId),
          eq(ideas.status, PUBLIC_IDEA_STATUS),
          challengeSlug ? eq(challenges.slug, challengeSlug) : undefined,
        ),
      )
      .orderBy(desc(ideas.createdAt));

    const badges = await roleBadgesFor([...new Set(rows.map((r) => r.authorId))]);

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      problemStatement: r.problemStatement,
      createdAt: r.createdAt,
      author: {
        name: r.authorName,
        username: r.authorUsername,
        roleBadge: badges.get(r.authorId) ?? 'builder',
      },
      challenge: r.challengeSlug && r.challengeTitle ? { slug: r.challengeSlug, title: r.challengeTitle } : null,
    }));
  },
);

export type IdeaDetail = {
  id: string;
  userId: string;
  status: IdeaStatus;
  title: string;
  problemStatement: string;
  proposedSolution: string;
  targetUsers: string;
  successCriteria: string;
  feasibilityNote: string | null;
  currentWorkaround: string | null;
  whyAgent: string | null;
  dataNeeded: string | null;
  teamCapability: string | null;
  orbitStage: OrbitStage | null;
  scores: {
    problem: number | null;
    agentFit: number | null;
    prototype: number | null;
    security: number | null;
    measurable: number | null;
    implement: number | null;
  };
  pitchUrl: string | null;
  pilot: {
    goal: string | null;
    scope: string | null;
    users: string | null;
    metrics: string | null;
    risks: string | null;
    decision: string | null;
  };
  clinicAt: Date | null;
  clinicNote: string | null;
  demoProject: { id: string; title: string } | null;
  demoScores: {
    function: number | null;
    value: number | null;
    security: number | null;
    readiness: number | null;
  };
  managerPitchAt: Date | null;
  managerPitchTo: string | null;
  ipTerms: IpTerms;
  reviewNote: string | null;
  createdAt: Date;
  updatedAt: Date;
  author: { name: string; username: string | null };
  challenge: { id: string; slug: string; title: string } | null;
};

/** Full idea by id. Visibility is decided by the caller (canViewIdea). */
export const getIdeaById = cache(async (id: string): Promise<IdeaDetail | null> => {
  const [row] = await getDb()
    .select({
      id: ideas.id,
      userId: ideas.userId,
      status: ideas.status,
      title: ideas.title,
      problemStatement: ideas.problemStatement,
      proposedSolution: ideas.proposedSolution,
      targetUsers: ideas.targetUsers,
      successCriteria: ideas.successCriteria,
      feasibilityNote: ideas.feasibilityNote,
      currentWorkaround: ideas.currentWorkaround,
      whyAgent: ideas.whyAgent,
      dataNeeded: ideas.dataNeeded,
      teamCapability: ideas.teamCapability,
      orbitStage: ideas.orbitStage,
      scoreProblem: ideas.scoreProblem,
      scoreAgentFit: ideas.scoreAgentFit,
      scorePrototype: ideas.scorePrototype,
      scoreSecurity: ideas.scoreSecurity,
      scoreMeasurable: ideas.scoreMeasurable,
      scoreImplement: ideas.scoreImplement,
      pitchUrl: ideas.pitchUrl,
      pilotGoal: ideas.pilotGoal,
      pilotScope: ideas.pilotScope,
      pilotUsers: ideas.pilotUsers,
      pilotMetrics: ideas.pilotMetrics,
      pilotRisks: ideas.pilotRisks,
      pilotDecision: ideas.pilotDecision,
      clinicAt: ideas.clinicAt,
      clinicNote: ideas.clinicNote,
      demoProjectId: projects.id,
      demoProjectTitle: projects.title,
      demoScoreFunction: ideas.demoScoreFunction,
      demoScoreValue: ideas.demoScoreValue,
      demoScoreSecurity: ideas.demoScoreSecurity,
      demoScoreReadiness: ideas.demoScoreReadiness,
      managerPitchAt: ideas.managerPitchAt,
      managerPitchTo: ideas.managerPitchTo,
      ipTerms: ideas.ipTerms,
      reviewNote: ideas.reviewNote,
      createdAt: ideas.createdAt,
      updatedAt: ideas.updatedAt,
      authorName: users.name,
      authorUsername: users.username,
      challengeId: challenges.id,
      challengeSlug: challenges.slug,
      challengeTitle: challenges.title,
    })
    .from(ideas)
    .innerJoin(users, eq(ideas.userId, users.id))
    .leftJoin(challenges, eq(ideas.challengeId, challenges.id))
    .leftJoin(projects, eq(ideas.demoProjectId, projects.id))
    .where(eq(ideas.id, id))
    .limit(1);

  if (!row) return null;

  return {
    id: row.id,
    userId: row.userId,
    status: row.status,
    title: row.title,
    problemStatement: row.problemStatement,
    proposedSolution: row.proposedSolution,
    targetUsers: row.targetUsers,
    successCriteria: row.successCriteria,
    feasibilityNote: row.feasibilityNote,
    currentWorkaround: row.currentWorkaround,
    whyAgent: row.whyAgent,
    dataNeeded: row.dataNeeded,
    teamCapability: row.teamCapability,
    orbitStage: row.orbitStage,
    scores: {
      problem: row.scoreProblem,
      agentFit: row.scoreAgentFit,
      prototype: row.scorePrototype,
      security: row.scoreSecurity,
      measurable: row.scoreMeasurable,
      implement: row.scoreImplement,
    },
    pitchUrl: row.pitchUrl,
    pilot: {
      goal: row.pilotGoal,
      scope: row.pilotScope,
      users: row.pilotUsers,
      metrics: row.pilotMetrics,
      risks: row.pilotRisks,
      decision: row.pilotDecision,
    },
    clinicAt: row.clinicAt,
    clinicNote: row.clinicNote,
    demoProject: row.demoProjectId && row.demoProjectTitle ? { id: row.demoProjectId, title: row.demoProjectTitle } : null,
    demoScores: {
      function: row.demoScoreFunction,
      value: row.demoScoreValue,
      security: row.demoScoreSecurity,
      readiness: row.demoScoreReadiness,
    },
    managerPitchAt: row.managerPitchAt,
    managerPitchTo: row.managerPitchTo,
    ipTerms: row.ipTerms,
    reviewNote: row.reviewNote,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    author: { name: row.authorName, username: row.authorUsername },
    challenge:
      row.challengeId && row.challengeSlug && row.challengeTitle
        ? { id: row.challengeId, slug: row.challengeSlug, title: row.challengeTitle }
        : null,
  };
});

/** Owner + status only — the cheap read the lifecycle guards need. */
export async function getIdeaOwnership(id: string): Promise<{ userId: string; status: IdeaStatus } | null> {
  const [row] = await getDb()
    .select({ userId: ideas.userId, status: ideas.status })
    .from(ideas)
    .where(eq(ideas.id, id))
    .limit(1);
  return row ?? null;
}

export type IdeaChallengeOption = { id: string; slug: string; title: string };

/** Active challenges, for the form's optional selector and the directory filter. */
export const getIdeaChallengeOptions = cache(async (orgId: string): Promise<IdeaChallengeOption[]> => {
  return getDb()
    .select({ id: challenges.id, slug: challenges.slug, title: challenges.title })
    .from(challenges)
    .where(and(eq(challenges.orgId, orgId), eq(challenges.status, 'active')))
    .orderBy(challenges.title);
});

/** True when the challenge exists, is active, and belongs to this org. */
export async function isSelectableChallenge(orgId: string, challengeId: string): Promise<boolean> {
  const [row] = await getDb()
    .select({ id: challenges.id })
    .from(challenges)
    .where(and(eq(challenges.id, challengeId), eq(challenges.orgId, orgId), eq(challenges.status, 'active')))
    .limit(1);
  return !!row;
}


export type MyIdea = {
  id: string;
  title: string;
  problemStatement: string;
  status: IdeaStatus;
  createdAt: Date;
  updatedAt: Date;
  challenge: { slug: string; title: string } | null;
};

/** The author's own ideas — every status, drafts included. Newest first. */
export const getMyIdeas = cache(async (userId: string, orgId: string): Promise<MyIdea[]> => {
  const rows = await getDb()
    .select({
      id: ideas.id,
      title: ideas.title,
      problemStatement: ideas.problemStatement,
      status: ideas.status,
      createdAt: ideas.createdAt,
      updatedAt: ideas.updatedAt,
      challengeSlug: challenges.slug,
      challengeTitle: challenges.title,
    })
    .from(ideas)
    .leftJoin(challenges, eq(ideas.challengeId, challenges.id))
    .where(and(eq(ideas.userId, userId), eq(ideas.orgId, orgId)))
    .orderBy(desc(ideas.createdAt));

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    problemStatement: r.problemStatement,
    status: r.status,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    challenge: r.challengeSlug && r.challengeTitle ? { slug: r.challengeSlug, title: r.challengeTitle } : null,
  }));
});

export type OrbitQueueItem = {
  id: string;
  title: string;
  status: IdeaStatus;
  orbitStage: OrbitStage;
  authorName: string;
  updatedAt: Date;
};

/** Ideas currently inside the Orbit pipeline, newest activity first. */
export async function getOrbitQueue(orgId: string): Promise<OrbitQueueItem[]> {
  const rows = await getDb()
    .select({
      id: ideas.id,
      title: ideas.title,
      status: ideas.status,
      orbitStage: ideas.orbitStage,
      authorName: users.name,
      updatedAt: ideas.updatedAt,
    })
    .from(ideas)
    .innerJoin(users, eq(ideas.userId, users.id))
    .where(
      and(eq(ideas.orgId, orgId), isNotNull(ideas.orbitStage), ne(ideas.status, 'rejected'), ne(ideas.orbitStage, 'next')),
    )
    .orderBy(desc(ideas.updatedAt));

  return rows.flatMap((r) =>
    r.orbitStage
      ? [{ id: r.id, title: r.title, status: r.status, orbitStage: r.orbitStage, authorName: r.authorName, updatedAt: r.updatedAt }]
      : [],
  );
}

export type IdeaMember = { id: string; name: string; username: string | null };

export async function getIdeaMembers(ideaId: string): Promise<IdeaMember[]> {
  return getDb()
    .select({ id: users.id, name: users.name, username: users.username })
    .from(ideaMembers)
    .innerJoin(users, eq(ideaMembers.userId, users.id))
    .where(eq(ideaMembers.ideaId, ideaId));
}

export async function isIdeaMember(ideaId: string, userId: string): Promise<boolean> {
  const [row] = await getDb()
    .select({ userId: ideaMembers.userId })
    .from(ideaMembers)
    .where(and(eq(ideaMembers.ideaId, ideaId), eq(ideaMembers.userId, userId)))
    .limit(1);
  return !!row;
}

export async function getDemoCandidates(ideaId: string, orgId: string) {
  const [idea] = await getDb()
    .select({ userId: ideas.userId })
    .from(ideas)
    .where(and(eq(ideas.id, ideaId), eq(ideas.orgId, orgId)))
    .limit(1);
  if (!idea) return [];
  const members = await getIdeaMembers(ideaId);
  const ids = [idea.userId, ...members.map((member) => member.id)];
  return getDb()
    .select({ id: projects.id, title: projects.title, owner: users.name })
    .from(projects)
    .innerJoin(users, eq(projects.userId, users.id))
    .where(and(eq(projects.orgId, orgId), eq(projects.status, 'published'), inArray(projects.userId, ids)));
}

export async function getOpenedCourseKeys(userId: string): Promise<string[]> {
  const rows = await getDb()
    .select({ courseKey: orbitCourseOpens.courseKey })
    .from(orbitCourseOpens)
    .where(eq(orbitCourseOpens.userId, userId));
  return rows.map((row) => row.courseKey);
}

export type IdeaMentor = { id: string; name: string; username: string | null; role: MentorRole };

export async function getIdeaMentors(ideaId: string): Promise<IdeaMentor[]> {
  return getDb()
    .select({ id: users.id, name: users.name, username: users.username, role: ideaMentors.role })
    .from(ideaMentors)
    .innerJoin(users, eq(ideaMentors.userId, users.id))
    .where(eq(ideaMentors.ideaId, ideaId));
}

export type RecruitSuggestion = { id: string; name: string; username: string; skills: number; domains: number };

/** Active coworkers who share a skill or domain with the author or a current member. */
export async function getRecruitSuggestions(ideaId: string, orgId: string): Promise<RecruitSuggestion[]> {
  const db = getDb();
  const [idea] = await db
    .select({ userId: ideas.userId })
    .from(ideas)
    .where(and(eq(ideas.id, ideaId), eq(ideas.orgId, orgId)))
    .limit(1);
  if (!idea) return [];

  const members = await getIdeaMembers(ideaId);
  const seed = [idea.userId, ...members.map((member) => member.id)];
  const [skillRows, domainRows] = await Promise.all([
    db.select({ skillId: userSkills.skillId }).from(userSkills).where(inArray(userSkills.userId, seed)),
    db.select({ domainId: userDomainExpertise.domainId }).from(userDomainExpertise).where(inArray(userDomainExpertise.userId, seed)),
  ]);
  const skillIds = [...new Set(skillRows.map((row) => row.skillId))];
  const domainIds = [...new Set(domainRows.map((row) => row.domainId))];
  if (skillIds.length === 0 && domainIds.length === 0) return [];

  const base = and(eq(users.orgId, orgId), eq(users.status, 'active'), notInArray(users.id, seed), isNotNull(users.username));
  const [bySkill, byDomain] = await Promise.all([
    skillIds.length
      ? db
          .select({
            userId: users.id,
            name: users.name,
            username: users.username,
            skills: sql<number>`count(distinct ${userSkills.skillId})::int`,
          })
          .from(userSkills)
          .innerJoin(users, eq(userSkills.userId, users.id))
          .where(and(base, inArray(userSkills.skillId, skillIds)))
          .groupBy(users.id, users.name, users.username)
      : Promise.resolve([]),
    domainIds.length
      ? db
          .select({
            userId: users.id,
            name: users.name,
            username: users.username,
            domains: sql<number>`count(distinct ${userDomainExpertise.domainId})::int`,
          })
          .from(userDomainExpertise)
          .innerJoin(users, eq(userDomainExpertise.userId, users.id))
          .where(and(base, inArray(userDomainExpertise.domainId, domainIds)))
          .groupBy(users.id, users.name, users.username)
      : Promise.resolve([]),
  ]);

  const merged = new Map<string, { id: string; name: string; username: string | null; skills: number; domains: number }>();
  for (const row of bySkill) {
    merged.set(row.userId, { id: row.userId, name: row.name, username: row.username, skills: Number(row.skills), domains: 0 });
  }
  for (const row of byDomain) {
    const existing = merged.get(row.userId);
    if (existing) existing.domains = Number(row.domains);
    else merged.set(row.userId, { id: row.userId, name: row.name, username: row.username, skills: 0, domains: Number(row.domains) });
  }

  return rankRecruitSuggestions(
    [...merged.values()].map((row) => ({
      userId: row.id,
      name: row.name,
      username: row.username,
      skills: row.skills,
      domains: row.domains,
    })),
  ).flatMap((row) => (row.username ? [{ id: row.userId, name: row.name, username: row.username, skills: row.skills, domains: row.domains }] : []));
}

export async function getLessonUrls(slugs: string[]): Promise<Map<string, string>> {
  if (slugs.length === 0) return new Map();
  const rows = await getDb()
    .select({ slug: lessons.slug, url: lessons.url })
    .from(lessons)
    .where(inArray(lessons.slug, slugs));
  return new Map(rows.flatMap((row) => (row.url ? [[row.slug, row.url] as const] : [])));
}
