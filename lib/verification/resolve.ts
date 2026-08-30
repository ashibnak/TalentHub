/**
 * The "cache or call the model" step of a verification run, isolated from Next,
 * the DB and the network so it can be unit-tested with injected collaborators.
 *
 * The cache rule is PROJECT_PLAN §3: a successful run already exists for this
 * exact (github_url, last_commit_sha) → reuse its output and do not call the
 * model. That is the single most expensive decision in the pipeline, so it
 * lives in one small function with one job.
 */
import type { AiResult } from '@/lib/ai/gateway';
import type { VerifySkillsOutput } from '@/lib/verification/rules';

export type CachedRun = { id: string; output: VerifySkillsOutput; llmModel: string };

export type ResolveDeps = {
  findCached: (githubUrl: string, commitSha: string, excludeRunId: string) => Promise<CachedRun | null>;
  callModel: (prompt: string) => Promise<AiResult<VerifySkillsOutput>>;
};

export type ResolvedVerdicts =
  | {
      ok: true;
      source: 'cache';
      output: VerifySkillsOutput;
      cachedRunId: string;
      llmModel: string;
      latencyMs: null;
      totalTokens: null;
      attempts: null;
    }
  | {
      ok: true;
      source: 'model';
      output: VerifySkillsOutput;
      llmModel: string;
      latencyMs: number;
      totalTokens: number | null;
      attempts: number;
    }
  | { ok: false; code: string; message: string };

export async function resolveVerdicts(
  args: { runId: string; githubUrl: string; commitSha: string | null; prompt: string },
  deps: ResolveDeps,
): Promise<ResolvedVerdicts> {
  // A repo with no commits has no cache key — always ask the model.
  if (args.commitSha) {
    const cached = await deps.findCached(args.githubUrl, args.commitSha, args.runId);
    if (cached) {
      console.info(`[ai.verify-skills] cache hit — sha=${args.commitSha.slice(0, 7)}, reusing run ${cached.id}`);
      return {
        ok: true,
        source: 'cache',
        output: cached.output,
        cachedRunId: cached.id,
        llmModel: cached.llmModel,
        latencyMs: null,
        totalTokens: null,
        attempts: null,
      };
    }
  }

  const result = await deps.callModel(args.prompt);
  if (!result.ok) return { ok: false, code: result.code, message: result.message };

  return {
    ok: true,
    source: 'model',
    output: result.data,
    llmModel: result.meta.model,
    latencyMs: result.meta.latencyMs,
    totalTokens: result.meta.totalTokens,
    attempts: result.meta.attempts,
  };
}
