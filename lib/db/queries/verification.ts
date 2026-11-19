import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { projects, projectSkills, skills, userSkills, users, verificationRuns } from '@/lib/db/schema';
import type { SkillPromotion, ClaimedSkill, VerifySkillsOutput } from '@/lib/verification/rules';

type Db = ReturnType<typeof getDb>;

export type VerificationInput = {
  projectId: string;
  userId: string;
  orgId: string;
  title: string;
  githubUrl: string;
  /** Skills claimed on the project that the owner also claims on their profile. */
  claimedSkills: (ClaimedSkill & { name: string })[];
};

/**
 * Everything one verification run needs about a project, or null when the
 * project can't be verified at all (missing, unpublished, no github_url).
 *
 * Only skills present on BOTH the project and the owner's profile are eligible:
 * the run writes to `user_skills`, so a project tag the user doesn't claim on
 * their profile has no row to promote.
 */
export async function getVerificationInput(projectId: string): Promise<VerificationInput | null> {
  const db = getDb();

  const [project] = await db
    .select({
      id: projects.id,
      userId: projects.userId,
      orgId: projects.orgId,
      title: projects.title,
      githubUrl: projects.githubUrl,
      status: projects.status,
    })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project || project.status !== 'published' || !project.githubUrl) return null;

  const claimedSkills = await db
    .select({
      skillId: skills.id,
      slug: skills.slug,
      name: skills.name,
      verified: userSkills.verified,
      verificationSource: userSkills.verificationSource,
    })
    .from(projectSkills)
    .innerJoin(skills, eq(projectSkills.skillId, skills.id))
    .innerJoin(
      userSkills,
      and(eq(userSkills.skillId, skills.id), eq(userSkills.userId, project.userId)),
    )
    .where(eq(projectSkills.projectId, projectId))
    .orderBy(skills.name);

  return {
    projectId: project.id,
    userId: project.userId,
    orgId: project.orgId,
    title: project.title,
    githubUrl: project.githubUrl,
    claimedSkills,
  };
}

/** Failsafe counter (PROJECT_PLAN §3): how often this project has failed. */
export async function countFailedRuns(projectId: string): Promise<number> {
  const [row] = await getDb()
    .select({ count: sql<number>`count(*)::int` })
    .from(verificationRuns)
    .where(and(eq(verificationRuns.projectId, projectId), eq(verificationRuns.status, 'failed')));
  return row?.count ?? 0;
}

/** True while a run for this project is still in flight — prevents double-firing. */
export async function hasPendingRun(projectId: string): Promise<boolean> {
  const [row] = await getDb()
    .select({ id: verificationRuns.id })
    .from(verificationRuns)
    .where(and(eq(verificationRuns.projectId, projectId), eq(verificationRuns.status, 'pending')))
    .limit(1);
  return !!row;
}

/** Written BEFORE any network call, so an interrupted run is still visible. */
export async function createPendingRun(input: {
  userId: string;
  projectId: string;
  githubUrl: string;
  llmProvider: string;
  llmModel: string;
}): Promise<string> {
  const [row] = await getDb()
    .insert(verificationRuns)
    .values({ ...input, status: 'pending' })
    .returning({ id: verificationRuns.id });
  return row.id;
}

/**
 * Queue marker on the project itself (the `pending_verification_at` column the
 * schema already carries). The `verification_runs` row is the audit trail; this
 * is the cheap "is this project waiting on the pipeline?" flag a project query
 * can read without joining the runs table.
 *
 * Set when a run is enqueued, cleared when it settles either way — a project
 * left marked forever would misreport as perpetually in-flight.
 */
export async function markProjectQueued(projectId: string): Promise<void> {
  await getDb()
    .update(projects)
    .set({ pendingVerificationAt: new Date() })
    .where(eq(projects.id, projectId));
}

export async function clearProjectQueued(projectId: string): Promise<void> {
  await getDb().update(projects).set({ pendingVerificationAt: null }).where(eq(projects.id, projectId));
}

/**
 * Cache lookup on (github_url, last_commit_sha) — PROJECT_PLAN §3. A successful
 * run for this exact repo state is reused verbatim instead of paying for
 * another model call.
 */
export async function findCachedRun(
  githubUrl: string,
  commitSha: string,
  excludeRunId: string,
): Promise<{ id: string; output: VerifySkillsOutput; llmModel: string } | null> {
  const [row] = await getDb()
    .select({ id: verificationRuns.id, output: verificationRuns.output, llmModel: verificationRuns.llmModel })
    .from(verificationRuns)
    .where(
      and(
        eq(verificationRuns.githubUrl, githubUrl),
        eq(verificationRuns.commitSha, commitSha),
        eq(verificationRuns.status, 'success'),
      ),
    )
    .orderBy(desc(verificationRuns.createdAt))
    .limit(1);

  if (!row || row.id === excludeRunId || !row.output) return null;
  return { id: row.id, output: row.output as unknown as VerifySkillsOutput, llmModel: row.llmModel };
}

export async function markRunSucceeded(
  runId: string,
  data: {
    output: VerifySkillsOutput;
    inputSummary: string;
    commitSha: string | null;
    latencyMs: number | null;
    totalTokens: number | null;
    attempts: number | null;
    llmModel?: string;
  },
): Promise<void> {
  await getDb()
    .update(verificationRuns)
    .set({
      status: 'success',
      output: data.output as unknown as Record<string, unknown>,
      inputSummary: data.inputSummary,
      commitSha: data.commitSha,
      latencyMs: data.latencyMs,
      totalTokens: data.totalTokens,
      attempts: data.attempts,
      ...(data.llmModel ? { llmModel: data.llmModel } : {}),
      completedAt: new Date(),
    })
    .where(eq(verificationRuns.id, runId));
}

export async function markRunFailed(
  runId: string,
  data: { errorMessage: string; commitSha?: string | null; latencyMs?: number | null; attempts?: number | null },
): Promise<void> {
  await getDb()
    .update(verificationRuns)
    .set({
      status: 'failed',
      // Provider/HTTP detail stays server-side; the admin UI shows this string
      // and nothing from it reaches an end user (CODE_CONVENTIONS §3).
      errorMessage: data.errorMessage.slice(0, 500),
      commitSha: data.commitSha ?? null,
      latencyMs: data.latencyMs ?? null,
      attempts: data.attempts ?? null,
      completedAt: new Date(),
    })
    .where(eq(verificationRuns.id, runId));
}

/**
 * Apply a run's promotions to `user_skills`.
 *
 * The WHERE clause is the last line of defence for the "never downgrade a
 * manual verification" rule: even if the caller passed a manually-verified
 * skill, this update skips it at the SQL level.
 */
export async function applyPromotions(
  userId: string,
  runId: string,
  promotions: SkillPromotion[],
): Promise<number> {
  if (promotions.length === 0) return 0;

  const db: Db = getDb();
  const now = new Date();
  const updated = await db
    .update(userSkills)
    .set({
      verified: true,
      verificationSource: 'ai_repo_analysis',
      verifiedAt: now,
      verificationRunId: runId,
    })
    .where(
      and(
        eq(userSkills.userId, userId),
        inArray(
          userSkills.skillId,
          promotions.map((p) => p.skillId),
        ),
        sql`${userSkills.verificationSource} is distinct from 'manual'`,
      ),
    )
    .returning({ skillId: userSkills.skillId });

  return updated.length;
}

/* ─────────────────────────── Admin read model ────────────────────── */

export type VerificationRunRow = {
  id: string;
  status: 'pending' | 'success' | 'failed';
  llmProvider: string;
  llmModel: string;
  latencyMs: number | null;
  totalTokens: number | null;
  attempts: number | null;
  errorMessage: string | null;
  commitSha: string | null;
  githubUrl: string | null;
  createdAt: Date;
  completedAt: Date | null;
  projectId: string;
  projectTitle: string;
  ownerName: string;
  ownerUsername: string | null;
  output: VerifySkillsOutput | null;
};

/** Newest-first run list for /admin/verifications, scoped to the org. */
export async function listVerificationRuns(orgId: string, limit = 50): Promise<VerificationRunRow[]> {
  const rows = await getDb()
    .select({
      id: verificationRuns.id,
      status: verificationRuns.status,
      llmProvider: verificationRuns.llmProvider,
      llmModel: verificationRuns.llmModel,
      latencyMs: verificationRuns.latencyMs,
      totalTokens: verificationRuns.totalTokens,
      attempts: verificationRuns.attempts,
      errorMessage: verificationRuns.errorMessage,
      commitSha: verificationRuns.commitSha,
      githubUrl: verificationRuns.githubUrl,
      createdAt: verificationRuns.createdAt,
      completedAt: verificationRuns.completedAt,
      projectId: verificationRuns.projectId,
      projectTitle: projects.title,
      ownerName: users.name,
      ownerUsername: users.username,
      output: verificationRuns.output,
    })
    .from(verificationRuns)
    .innerJoin(projects, eq(verificationRuns.projectId, projects.id))
    .innerJoin(users, eq(verificationRuns.userId, users.id))
    .where(eq(projects.orgId, orgId))
    .orderBy(desc(verificationRuns.createdAt))
    .limit(limit);

  return rows.map((r) => ({ ...r, output: (r.output as unknown as VerifySkillsOutput | null) ?? null }));
}

/** Per-project failure counts, so the admin list can flag the failsafe. */
export async function countFailedRunsByProject(projectIds: string[]): Promise<Map<string, number>> {
  if (projectIds.length === 0) return new Map();
  const rows = await getDb()
    .select({ projectId: verificationRuns.projectId, count: sql<number>`count(*)::int` })
    .from(verificationRuns)
    .where(and(inArray(verificationRuns.projectId, projectIds), eq(verificationRuns.status, 'failed')))
    .groupBy(verificationRuns.projectId);
  return new Map(rows.map((r) => [r.projectId, r.count]));
}
