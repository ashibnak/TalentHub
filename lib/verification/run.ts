/**
 * Verification orchestration — admin/publish-triggered, no cron.
 *
 * Railway runs one web process for this app, and the repo already chose
 * request-triggered background work over a scheduler (see
 * `freezeLastWeekAction` closing the leaderboard week). This follows that
 * precedent: publishing a project writes a `verification_runs` row
 * synchronously, then hands the slow part to Next's `after()` so the response
 * isn't blocked and the work still runs inside the same server process.
 *
 * Nothing here throws at its caller. A publish must never fail because GitHub
 * was down or the LLM proxy 401'd — the run row records the failure instead.
 */
import { after } from 'next/server';
import { complete, getAiConfig, type AiResult } from '@/lib/ai/gateway';
import { VERIFY_SKILLS_ACTION, buildVerifySkillsPrompt } from '@/lib/ai/prompts/verify-skills';
import { fetchRepoSnapshot, repoLabel } from '@/lib/github';
import {
  applyPromotions,
  clearProjectQueued,
  countFailedRuns,
  createPendingRun,
  findCachedRun,
  getVerificationInput,
  hasPendingRun,
  markProjectQueued,
  markRunFailed,
  markRunSucceeded,
  type VerificationInput,
} from '@/lib/db/queries/verification';
import {
  MAX_FAILED_RUNS,
  VerifySkillsOutputSchema,
  selectSkillsToVerify,
  shouldRetry,
  type VerifySkillsOutput,
} from '@/lib/verification/rules';
import { resolveVerdicts } from '@/lib/verification/resolve';

export type StartOutcome =
  | { started: true; runId: string }
  | {
      started: false;
      reason: 'not_eligible' | 'no_claimed_skills' | 'already_running' | 'failsafe_tripped';
    };

/**
 * Kick off verification for a published project. Awaits only the cheap parts
 * (eligibility + the pending row); the GitHub + LLM work runs after the
 * response via `after()`.
 *
 * `force: true` is the admin's manual retry — it bypasses the failsafe, which
 * is the whole point of having a retry button.
 */
export async function startProjectVerification(
  projectId: string,
  opts: { force?: boolean } = {},
): Promise<StartOutcome> {
  const input = await getVerificationInput(projectId);
  // No github_url, unpublished, or gone — plan §3: those projects keep all
  // their skills as "claimed", which is the correct resting state.
  if (!input) return { started: false, reason: 'not_eligible' };
  if (input.claimedSkills.length === 0) return { started: false, reason: 'no_claimed_skills' };

  if (!opts.force) {
    if (await hasPendingRun(projectId)) return { started: false, reason: 'already_running' };

    const failed = await countFailedRuns(projectId);
    if (!shouldRetry(failed)) {
      // Failsafe (plan §3): stop burning quota, leave skills claimed, log it.
      console.warn(
        `[ai.verify-skills] failsafe — project ${projectId} has ${failed} failed runs (max ${MAX_FAILED_RUNS}); skills stay claimed, auto-retry disabled`,
      );
      return { started: false, reason: 'failsafe_tripped' };
    }
  }

  // Read config now only to stamp provider/model on the row. If it's missing we
  // still create the run — the failure then shows up in /admin/verifications
  // instead of vanishing silently.
  let llmProvider = 'unconfigured';
  let llmModel = 'unconfigured';
  try {
    const config = getAiConfig();
    llmProvider = config.provider;
    llmModel = config.model;
  } catch {
    console.error('[ai.verify-skills] gateway is not configured — the run will be recorded as failed');
  }

  const runId = await createPendingRun({
    userId: input.userId,
    projectId: input.projectId,
    githubUrl: input.githubUrl,
    llmProvider,
    llmModel,
  });

  // Enqueue = a pending run row PLUS the project's queue marker, both written
  // before the response returns so the state is durable even if the process dies.
  await markProjectQueued(input.projectId);

  console.info(`[ai.verify-skills] queued — run ${runId}, project ${projectId}, ${input.claimedSkills.length} claimed skill(s)`);
  after(() => executeVerificationRun(runId, input));

  return { started: true, runId };
}

/**
 * Do the actual work for a pending run: read the repo, reuse a cached verdict
 * or call the model, then promote the skills that cleared the threshold.
 * Always resolves — every failure path writes `status='failed'` first.
 */
export async function executeVerificationRun(runId: string, input: VerificationInput): Promise<void> {
  const startedAt = Date.now();
  try {
    await runVerification(runId, input, startedAt);
  } finally {
    // Whatever happened, the project is no longer queued. In `finally` so no
    // early return or throw above can strand the marker set at enqueue time.
    await clearProjectQueued(input.projectId).catch((err) =>
      console.error(`[ai.verify-skills] could not clear queue marker for project ${input.projectId}`, err),
    );
  }
}

/** The run body. Always resolves — every failure path writes status='failed'. */
async function runVerification(runId: string, input: VerificationInput, startedAt: number): Promise<void> {
  try {
    const snapshot = await fetchRepoSnapshot(input.githubUrl);
    if (!snapshot.ok) {
      console.error(`[ai.verify-skills] github ${snapshot.code} — run ${runId}, ${repoLabel(input.githubUrl)}: ${snapshot.message}`);
      await markRunFailed(runId, {
        errorMessage: `github:${snapshot.code} — ${snapshot.message}`,
        latencyMs: Date.now() - startedAt,
      });
      return;
    }

    const repo = snapshot.repo;
    const prompt = buildVerifySkillsPrompt({
      repoName: repo.name,
      repoDescription: repo.description,
      languages: repo.languages,
      stars: repo.stars,
      readme: repo.readme,
      files: repo.files,
      commitMessages: repo.commitMessages,
      claimedSkills: input.claimedSkills.map((s) => ({ slug: s.slug, name: s.name })),
    });

    const resolved = await resolveVerdicts(
      { runId, githubUrl: input.githubUrl, commitSha: repo.lastCommitSha, prompt },
      {
        findCached: findCachedRun,
        callModel: (p): Promise<AiResult<VerifySkillsOutput>> =>
          complete(VERIFY_SKILLS_ACTION, p, VerifySkillsOutputSchema),
      },
    );

    if (!resolved.ok) {
      await markRunFailed(runId, {
        errorMessage: `${resolved.code} — ${resolved.message}`,
        commitSha: repo.lastCommitSha,
        latencyMs: Date.now() - startedAt,
      });
      return;
    }

    // Plan §3: a repo with no README (or an empty one) loses 0.2 confidence on
    // every skill before thresholding. Applied here from the fetched repo state
    // rather than trusting the model to have done its own arithmetic.
    const hasReadme = !!repo.readme && repo.readme.trim().length > 0;
    const promotions = selectSkillsToVerify(resolved.output.verifications, input.claimedSkills, { hasReadme });
    const applied = await applyPromotions(input.userId, runId, promotions);

    await markRunSucceeded(runId, {
      output: resolved.output,
      inputSummary: summarize(repo.name, input, resolved.source),
      commitSha: repo.lastCommitSha,
      latencyMs: resolved.source === 'model' ? resolved.latencyMs : Date.now() - startedAt,
      totalTokens: resolved.source === 'model' ? resolved.totalTokens : null,
      attempts: resolved.source === 'model' ? resolved.attempts : null,
      llmModel: resolved.llmModel,
    });

    console.info(
      `[ai.verify-skills] done — run ${runId}, source=${resolved.source}, ${applied}/${input.claimedSkills.length} skill(s) verified`,
    );
  } catch (err) {
    // Belt and braces: an unexpected throw here would otherwise leave the run
    // stuck on 'pending' forever and block every later auto-run for the project.
    console.error(`[ai.verify-skills] unexpected error — run ${runId}`, err);
    await markRunFailed(runId, {
      errorMessage: `unexpected — ${err instanceof Error ? err.message : String(err)}`,
      latencyMs: Date.now() - startedAt,
    }).catch((writeErr) => console.error(`[ai.verify-skills] could not record failure for run ${runId}`, writeErr));
  }
}

function summarize(repoName: string, input: VerificationInput, source: 'cache' | 'model'): string {
  return `${repoName} · ${input.claimedSkills.length} claimed skill(s) · source=${source}`;
}
