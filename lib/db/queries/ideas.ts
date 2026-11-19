import { cache } from 'react';
import { and, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { challenges, ideas, skills, userDomainExpertise, userSkills, users } from '@/lib/db/schema';
import { PUBLIC_IDEA_STATUS, type IdeaStatus } from '@/lib/ideas/rules';
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
