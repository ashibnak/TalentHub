import { cache } from 'react';
import { and, count, desc, eq, inArray, isNotNull, ne, notInArray } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { applications, opportunities, opportunitySkills, skills, userSkills, users } from '@/lib/db/schema';
import type { OpportunityListItem } from '@/lib/db/queries/opportunities';

// ── Matching (v1, transparent): a member's score for an opportunity is
//    |their skills ∩ required| / |required|, as a rounded percent.
//    Opportunities without required skills simply have no score. ──

export type MatchScore = { pct: number; have: number; total: number };

export type RequirementSkill = { slug: string; name: string };

/** Required skills of one opportunity (for the detail page). */
export const getOpportunitySkills = cache(async (opportunityId: string): Promise<RequirementSkill[]> => {
  return getDb()
    .select({ slug: skills.slug, name: skills.name })
    .from(opportunitySkills)
    .innerJoin(skills, eq(opportunitySkills.skillId, skills.id))
    .where(eq(opportunitySkills.opportunityId, opportunityId))
    .orderBy(skills.name);
});

/** The skill slugs a user has claimed (for met/missing highlighting). */
export const getUserSkillSlugs = cache(async (userId: string): Promise<Set<string>> => {
  const rows = await getDb()
    .select({ slug: skills.slug })
    .from(userSkills)
    .innerJoin(skills, eq(userSkills.skillId, skills.id))
    .where(eq(userSkills.userId, userId));
  return new Set(rows.map((r) => r.slug));
});

/** Match scores of ONE user against MANY opportunities (list annotation).
 *  Returns a map keyed by opportunity id; opportunities without requirements
 *  are absent from the map. */
export async function getMatchScores(userId: string, opportunityIds: string[]): Promise<Map<string, MatchScore>> {
  if (opportunityIds.length === 0) return new Map();
  const db = getDb();
  const [reqRows, mySkillRows] = await Promise.all([
    db
      .select({ opportunityId: opportunitySkills.opportunityId, skillId: opportunitySkills.skillId })
      .from(opportunitySkills)
      .where(inArray(opportunitySkills.opportunityId, opportunityIds)),
    db.select({ skillId: userSkills.skillId }).from(userSkills).where(eq(userSkills.userId, userId)),
  ]);
  const mine = new Set(mySkillRows.map((r) => r.skillId));

  const byOpp = new Map<string, { have: number; total: number }>();
  for (const r of reqRows) {
    const entry = byOpp.get(r.opportunityId) ?? { have: 0, total: 0 };
    entry.total += 1;
    if (mine.has(r.skillId)) entry.have += 1;
    byOpp.set(r.opportunityId, entry);
  }
  return new Map(
    [...byOpp.entries()].map(([id, { have, total }]) => [id, { have, total, pct: Math.round((have / total) * 100) }]),
  );
}

/** Match scores of MANY users against ONE opportunity (applicant ranking).
 *  Users are absent from the map when the opportunity has no requirements. */
export async function getMatchForUsers(userIds: string[], opportunityId: string): Promise<Map<string, MatchScore>> {
  if (userIds.length === 0) return new Map();
  const db = getDb();
  const reqRows = await db
    .select({ skillId: opportunitySkills.skillId })
    .from(opportunitySkills)
    .where(eq(opportunitySkills.opportunityId, opportunityId));
  if (reqRows.length === 0) return new Map();
  const required = reqRows.map((r) => r.skillId);

  const haveRows = await db
    .select({ userId: userSkills.userId, n: count() })
    .from(userSkills)
    .where(and(inArray(userSkills.userId, userIds), inArray(userSkills.skillId, required)))
    .groupBy(userSkills.userId);
  const haveByUser = new Map(haveRows.map((r) => [r.userId, Number(r.n)]));

  return new Map(
    userIds.map((id) => {
      const have = haveByUser.get(id) ?? 0;
      return [id, { have, total: required.length, pct: Math.round((have / required.length) * 100) }];
    }),
  );
}

export type RecommendedOpportunity = OpportunityListItem & { match: MatchScore };

/** Open opportunities the user hasn't applied to (and doesn't own), ranked by
 *  match — the «پیشنهاد برای تو» section. Only ≥1-skill overlaps qualify. */
export const getRecommendedOpportunities = cache(async (userId: string, limit = 4): Promise<RecommendedOpportunity[]> => {
  const db = getDb();
  const rows = await db
    .select({
      id: opportunities.id,
      title: opportunities.title,
      description: opportunities.description,
      sponsorName: users.name,
      sponsorUsername: users.username,
    })
    .from(opportunities)
    .innerJoin(users, eq(opportunities.sponsorId, users.id))
    .where(
      and(
        eq(opportunities.status, 'open'),
        ne(opportunities.sponsorId, userId),
        notInArray(
          opportunities.id,
          db.select({ id: applications.opportunityId }).from(applications).where(eq(applications.applicantId, userId)),
        ),
      ),
    )
    .orderBy(desc(opportunities.createdAt));
  if (rows.length === 0) return [];

  const [scores, counts] = await Promise.all([
    getMatchScores(userId, rows.map((r) => r.id)),
    db
      .select({ opportunityId: applications.opportunityId, n: count() })
      .from(applications)
      .where(inArray(applications.opportunityId, rows.map((r) => r.id)))
      .groupBy(applications.opportunityId),
  ]);
  const countByOpp = new Map(counts.map((c) => [c.opportunityId, Number(c.n)]));

  return rows
    .flatMap((r) => {
      const match = scores.get(r.id);
      if (!match || match.have === 0) return [];
      return [{ ...r, applicantCount: countByOpp.get(r.id) ?? 0, match }];
    })
    .sort((a, b) => b.match.pct - a.match.pct)
    .slice(0, limit);
});

export type TopCandidate = {
  userId: string;
  name: string;
  username: string | null;
  roleTitle: string | null;
  match: MatchScore;
};

/** Best-matching members who have NOT applied — the sponsor's «بهترین‌های گراف».
 *  Active talent with a profile, excluding the sponsor and existing applicants. */
export const getTopCandidates = cache(async (opportunityId: string, limit = 5): Promise<TopCandidate[]> => {
  const db = getDb();
  const reqRows = await db
    .select({ skillId: opportunitySkills.skillId })
    .from(opportunitySkills)
    .where(eq(opportunitySkills.opportunityId, opportunityId));
  if (reqRows.length === 0) return [];
  const required = reqRows.map((r) => r.skillId);

  const [opp] = await db
    .select({ sponsorId: opportunities.sponsorId })
    .from(opportunities)
    .where(eq(opportunities.id, opportunityId))
    .limit(1);
  if (!opp) return [];

  const rows = await db
    .select({ userId: users.id, name: users.name, username: users.username, roleTitle: users.roleTitle, n: count() })
    .from(userSkills)
    .innerJoin(users, eq(userSkills.userId, users.id))
    .where(
      and(
        inArray(userSkills.skillId, required),
        eq(users.status, 'active'),
        eq(users.isAdmin, false),
        eq(users.accountType, 'talent'),
        isNotNull(users.username),
        ne(users.id, opp.sponsorId),
        notInArray(
          users.id,
          db.select({ id: applications.applicantId }).from(applications).where(eq(applications.opportunityId, opportunityId)),
        ),
      ),
    )
    .groupBy(users.id, users.name, users.username, users.roleTitle)
    // Deterministic tie-break (name) so the top-5 set is stable across renders.
    .orderBy(desc(count()), users.name)
    .limit(limit);

  return rows.map((r) => ({
    userId: r.userId,
    name: r.name,
    username: r.username,
    roleTitle: r.roleTitle,
    match: { have: Number(r.n), total: required.length, pct: Math.round((Number(r.n) / required.length) * 100) },
  }));
});
