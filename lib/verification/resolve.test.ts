import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveVerdicts, type CachedRun } from './resolve.ts';
import type { AiResult } from '@/lib/ai/gateway';
import type { VerifySkillsOutput } from '@/lib/verification/rules';

const OUTPUT: VerifySkillsOutput = {
  verifications: [{ skill_slug: 'python', confidence: 0.9, evidence: 'main.py', verdict: 'verified' }],
  summary: 'solid',
};

const modelResult: AiResult<VerifySkillsOutput> = {
  ok: true,
  data: OUTPUT,
  raw: JSON.stringify(OUTPUT),
  meta: {
    action: 'verify-skills',
    provider: 'api.example.test',
    model: 'gpt-4o',
    latencyMs: 4900,
    attempts: 1,
    promptTokens: 900,
    completionTokens: 120,
    totalTokens: 1020,
  },
};

/** Counts model calls so the cache assertions are about cost, not shape. */
function spies(cached: CachedRun | null) {
  const state = { modelCalls: 0, cacheLookups: 0 };
  return {
    state,
    deps: {
      findCached: async () => {
        state.cacheLookups++;
        return cached;
      },
      callModel: async () => {
        state.modelCalls++;
        return modelResult;
      },
    },
  };
}

const ARGS = {
  runId: 'run-2',
  githubUrl: 'https://github.com/acme/widget',
  commitSha: 'abc1234def',
  prompt: 'prompt',
};

describe('resolveVerdicts', () => {
  it('reuses a cached run for the same sha and never calls the model', async () => {
    const { state, deps } = spies({ id: 'run-1', output: OUTPUT, llmModel: 'gpt-4o' });

    const result = await resolveVerdicts(ARGS, deps);

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.source, 'cache');
    assert.deepEqual(result.output, OUTPUT);
    assert.equal(state.modelCalls, 0, 'a cache hit must not cost a model call');
  });

  it('calls the model when no run exists for this sha', async () => {
    const { state, deps } = spies(null);

    const result = await resolveVerdicts(ARGS, deps);

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.source, 'model');
    assert.equal(state.modelCalls, 1);
    assert.equal(result.latencyMs, 4900);
    assert.equal(result.totalTokens, 1020);
  });

  it('skips the cache lookup entirely when the repo has no commit sha', async () => {
    const { state, deps } = spies({ id: 'run-1', output: OUTPUT, llmModel: 'gpt-4o' });

    const result = await resolveVerdicts({ ...ARGS, commitSha: null }, deps);

    assert.equal(state.cacheLookups, 0, 'no sha means no cache key');
    assert.equal(state.modelCalls, 1);
    assert.equal(result.ok, true);
  });

  it('surfaces a model failure as a typed failure rather than throwing', async () => {
    const result = await resolveVerdicts(ARGS, {
      findCached: async () => null,
      callModel: async () => ({
        ok: false,
        code: 'invalid_json',
        message: 'model did not return parseable JSON after a retry',
        raw: 'nope',
        meta: { ...modelResult.meta, attempts: 2 },
      }),
    });

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.code, 'invalid_json');
  });
});
