import { cache } from 'react';
import { and, desc, eq, inArray, ne, notInArray, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import {
  challenges,
  challengeProblems,
  domains,
  ideas,
  projectChallengeProblems,
  projects,
  skills,
  userDomainExpertise,
  userSkills,
  users,
  verificationRuns,
} from '@/lib/db/schema';
import { computeRoleBadge, type RoleBadge } from '@/lib/users/role-badge';
import { VERIFICATION_CONFIDENCE_THRESHOLD, type VerifySkillsOutput } from '@/lib/verification/rules';
import { weakestUnverified, type SkillGap } from '@/lib/home/rules';

/**
 * Queries backing the signed-in home dashboard.
 *
 * Every function here returns an empty/null result rather than throwing, so a
 * single failing block degrades to rendering nothing instead of taking the
 * whole page down (the page composes them with Promise.all).
 */

/* ─────────── Block 3 · ideas that need this member's domain ──────── */

export type DomainValidationRequest = {
  ideaId: string;
  title: string;
  problemStatement: string;
  authorName: string;
  challengeTitle: string;
  domainName: string;
};

/**
 * Submitted ideas sitting in a challenge that matches one of the viewer's own
 * `user_domain_expertise` rows.
 *
 * The join is `domains.slug = challenges.slug`, which the plan fixes as the
 * domain↔challenge mapping ("Domain `hr` → Challenge `hr`"). Own ideas are
 * excluded — you cannot validate your own.
 *
 * This is the highest-value block on the page for the Domain Expert persona,
 * who the plan flags as most at risk of feeling marginal: it is the one place
 * that says "your non-technical expertise is specifically needed here".
 */
export const getDomainValidationQueue = cache(
  async (userId: string, orgId: string, limit = 2): Promise<DomainValidationRequest[]> => {
    const rows = await getDb()
      .select({
        ideaId: ideas.id,
        title: ideas.title,
        problemStatement: ideas.problemStatement,
        authorName: users.name,
        challengeTitle: challenges.title,
        domainName: domains.name,
      })
      .from(ideas)
      .innerJoin(users, eq(ideas.userId, users.id))
      .innerJoin(challenges, eq(ideas.challengeId, challenges.id))
      .innerJoin(domains, eq(domains.slug, challenges.slug))
      .innerJoin(
        userDomainExpertise,
        and(eq(userDomainExpertise.domainId, domains.id), eq(userDomainExpertise.userId, userId)),
      )
      .where(and(eq(ideas.orgId, orgId), eq(ideas.status, 'submitted'), ne(ideas.userId, userId)))
      .orderBy(desc(ideas.createdAt))
      .limit(limit);

    return rows;
  },
);

/* ──────────────── Block 5 · latest AI analysis of my work ─────────── */

export type VerificationInsight = {
  runId: string;
  projectId: string;
  projectTitle: string;
  verifiedCount: number;
  totalCount: number;
  /** The weakest claim the model rejected — null when everything passed. */
  gap: SkillGap | null;
  completedAt: Date | null;
};

/** The most recent SUCCESSFUL verification run across the viewer's projects. */
export const getLatestVerificationInsight = cache(
  async (userId: string): Promise<VerificationInsight | null> => {
    const db = getDb();

    const [run] = await db
      .select({
        id: verificationRuns.id,
        projectId: verificationRuns.projectId,
        projectTitle: projects.title,
        output: verificationRuns.output,
        completedAt: verificationRuns.completedAt,
      })
      .from(verificationRuns)
      .innerJoin(projects, eq(verificationRuns.projectId, projects.id))
      .where(and(eq(verificationRuns.userId, userId), eq(verificationRuns.status, 'success')))
      .orderBy(desc(verificationRuns.createdAt))
      .limit(1);

    if (!run?.output) return null;

    const output = run.output as unknown as VerifySkillsOutput;
    const verifications = output.verifications ?? [];
    if (verifications.length === 0) return null;

    // Human-readable skill names for the slugs the model echoed back.
    const slugs = verifications.map((v) => v.skill_slug);
    const nameRows = slugs.length
      ? await db.select({ slug: skills.slug, name: skills.name }).from(skills).where(inArray(skills.slug, slugs))
      : [];
    const slugToName = new Map(nameRows.map((r) => [r.slug, r.name]));

    return {
      runId: run.id,
      projectId: run.projectId,
      projectTitle: run.projectTitle,
      verifiedCount: verifications.filter((v) => v.confidence >= VERIFICATION_CONFIDENCE_THRESHOLD).length,
      totalCount: verifications.length,
      gap: weakestUnverified(verifications, VERIFICATION_CONFIDENCE_THRESHOLD, slugToName),
      completedAt: run.completedAt,
    };
  },
);

/* ────────────────────── Block 7 · org activity feed ───────────────── */

export type ActivityKind = 'idea_submitted' | 'project_submitted' | 'skills_verified' | 'spotlight_won';

export type ActivityEvent = {
  id: string;
  kind: ActivityKind;
  actorName: string;
  actorUsername: string | null;
  /** What the event is about — an idea title, project title, or problem title. */
  subject: string;
  /** Extra context, e.g. the challenge a project was submitted to. */
  context: string | null;
  count: number;
  at: Date;
};

/**
 * The last few things people did across the org, newest first.
 *
 * Four small UNION-free queries merged in JS rather than one SQL UNION: the
 * shapes differ enough that a UNION would need four sets of NULL padding, and
 * each query is indexed and tiny (LIMIT n). Phrasing is person-centric — the
 * component says «مریم یک ایده ثبت کرد», never «۳ رکورد اضافه شد».
 */
export const getActivityFeed = cache(async (orgId: string, limit = 5): Promise<ActivityEvent[]> => {
  const db = getDb();

  const [ideaRows, submissionRows, verifiedRows, spotlightRows] = await Promise.all([
    db
      .select({
        id: ideas.id,
        actorName: users.name,
        actorUsername: users.username,
        subject: ideas.title,
        at: ideas.updatedAt,
      })
      .from(ideas)
      .innerJoin(users, eq(ideas.userId, users.id))
      .where(and(eq(ideas.orgId, orgId), notInArray(ideas.status, ['draft'])))
      .orderBy(desc(ideas.updatedAt))
      .limit(limit),

    db
      .select({
        id: projectChallengeProblems.projectId,
        actorName: users.name,
        actorUsername: users.username,
        subject: projects.title,
        context: challengeProblems.title,
        at: projectChallengeProblems.createdAt,
      })
      .from(projectChallengeProblems)
      .innerJoin(projects, eq(projectChallengeProblems.projectId, projects.id))
      .innerJoin(users, eq(projects.userId, users.id))
      .innerJoin(challengeProblems, eq(projectChallengeProblems.challengeProblemId, challengeProblems.id))
      .where(eq(projects.orgId, orgId))
      .orderBy(desc(projectChallengeProblems.createdAt))
      .limit(limit),

    // Skills verified in one run, grouped so the feed says "3 skills verified"
    // rather than three near-identical lines.
    db
      .select({
        id: verificationRuns.id,
        actorName: users.name,
        actorUsername: users.username,
        subject: projects.title,
        count: sql<number>`count(${userSkills.skillId})::int`,
        at: verificationRuns.completedAt,
      })
      .from(verificationRuns)
      .innerJoin(users, eq(verificationRuns.userId, users.id))
      .innerJoin(projects, eq(verificationRuns.projectId, projects.id))
      .innerJoin(userSkills, eq(userSkills.verificationRunId, verificationRuns.id))
      .where(and(eq(projects.orgId, orgId), eq(verificationRuns.status, 'success')))
      .groupBy(verificationRuns.id, users.name, users.username, projects.title, verificationRuns.completedAt)
      .orderBy(desc(verificationRuns.completedAt))
      .limit(limit),

    db
      .select({
        id: challengeProblems.id,
        actorName: users.name,
        actorUsername: users.username,
        subject: projects.title,
        context: challengeProblems.title,
        at: challengeProblems.spotlightEndsAt,
      })
      .from(challengeProblems)
      .innerJoin(projects, eq(challengeProblems.spotlightWinnerProjectId, projects.id))
      .innerJoin(users, eq(projects.userId, users.id))
      .innerJoin(challenges, eq(challengeProblems.challengeId, challenges.id))
      .where(eq(challenges.orgId, orgId))
      .orderBy(desc(challengeProblems.spotlightEndsAt))
      .limit(limit),
  ]);

  const events: ActivityEvent[] = [
    ...ideaRows.map((r) => ({ ...r, kind: 'idea_submitted' as const, context: null, count: 1, at: r.at })),
    ...submissionRows.map((r) => ({ ...r, kind: 'project_submitted' as const, count: 1 })),
    ...verifiedRows
      .filter((r): r is typeof r & { at: Date } => !!r.at)
      .map((r) => ({ ...r, kind: 'skills_verified' as const, context: null, count: Number(r.count) })),
    ...spotlightRows
      .filter((r): r is typeof r & { at: Date } => !!r.at)
      .map((r) => ({ ...r, kind: 'spotlight_won' as const, count: 1 })),
  ];

  return events.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, limit);
});

/* ─────────────────── Block 8 · people with similar skills ────────── */

export type SimilarPerson = {
  userId: string;
  name: string;
  username: string | null;
  roleTitle: string | null;
  roleBadge: RoleBadge;
  sharedSkillCount: number;
};

/**
 * The members sharing the most skills with the viewer — the one place the
 * "graph" the product is named after is actually visible.
 *
 * The overlap is ONE grouped self-join on user_skills, not a per-user count
 * (no N+1). The role_badge counts are two more grouped queries over just the
 * handful of matched users.
 */
export const getSimilarPeople = cache(
  async (userId: string, orgId: string, limit = 3): Promise<SimilarPerson[]> => {
    const db = getDb();

    const mine = db
      .select({ skillId: userSkills.skillId })
      .from(userSkills)
      .where(eq(userSkills.userId, userId));

    const overlap = await db
      .select({
        userId: userSkills.userId,
        name: users.name,
        username: users.username,
        roleTitle: users.roleTitle,
        sharedSkillCount: sql<number>`count(*)::int`,
      })
      .from(userSkills)
      .innerJoin(users, eq(userSkills.userId, users.id))
      .where(
        and(
          inArray(userSkills.skillId, mine),
          ne(userSkills.userId, userId),
          eq(users.orgId, orgId),
          eq(users.isAdmin, false),
        ),
      )
      .groupBy(userSkills.userId, users.name, users.username, users.roleTitle)
      .orderBy(desc(sql`count(*)`), users.name)
      .limit(limit);

    if (overlap.length === 0) return [];

    const ids = overlap.map((r) => r.userId);
    const [techRows, domainRows] = await Promise.all([
      db
        .select({ userId: userSkills.userId, n: sql<number>`count(*)::int` })
        .from(userSkills)
        .innerJoin(skills, eq(userSkills.skillId, skills.id))
        .where(and(inArray(userSkills.userId, ids), ne(skills.category, 'ai_tool')))
        .groupBy(userSkills.userId),
      db
        .select({ userId: userDomainExpertise.userId, n: sql<number>`count(*)::int` })
        .from(userDomainExpertise)
        .where(inArray(userDomainExpertise.userId, ids))
        .groupBy(userDomainExpertise.userId),
    ]);
    const tech = new Map(techRows.map((r) => [r.userId, Number(r.n)]));
    const doms = new Map(domainRows.map((r) => [r.userId, Number(r.n)]));

    return overlap.map((r) => ({
      userId: r.userId,
      name: r.name,
      username: r.username,
      roleTitle: r.roleTitle,
      roleBadge: computeRoleBadge({
        technicalSkillCount: tech.get(r.userId) ?? 0,
        domainCount: doms.get(r.userId) ?? 0,
      }),
      sharedSkillCount: Number(r.sharedSkillCount),
    }));
  },
);

/* ─────────────────── The viewer's own computed role_badge ────────── */

/**
 * The viewer's role_badge. Computed, never stored (plan §2), and NOT available
 * from getMyProfile — which returns editable profile fields only. Two cheap
 * counts, same derivation the profile and leaderboard use.
 */
export const getMyRoleBadge = cache(async (userId: string): Promise<RoleBadge> => {
  const db = getDb();
  const [[tech], [doms]] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(userSkills)
      .innerJoin(skills, eq(userSkills.skillId, skills.id))
      // ai_tool excluded: a Domain Expert who uses Cursor is still a Domain Expert.
      .where(and(eq(userSkills.userId, userId), ne(skills.category, 'ai_tool'))),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(userDomainExpertise)
      .where(eq(userDomainExpertise.userId, userId)),
  ]);
  return computeRoleBadge({
    technicalSkillCount: Number(tech?.n ?? 0),
    domainCount: Number(doms?.n ?? 0),
  });
});

/* ───────────────── Day-one state · cheap existence counts ────────── */

/** Project + idea counts for the viewer — decides the day-one layout. */
export const getContributionCounts = cache(
  async (userId: string): Promise<{ projectCount: number; ideaCount: number }> => {
    const db = getDb();
    const [[p], [i]] = await Promise.all([
      db.select({ n: sql<number>`count(*)::int` }).from(projects).where(eq(projects.userId, userId)),
      db.select({ n: sql<number>`count(*)::int` }).from(ideas).where(eq(ideas.userId, userId)),
    ]);
    return { projectCount: Number(p?.n ?? 0), ideaCount: Number(i?.n ?? 0) };
  },
);
