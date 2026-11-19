/**
 * Gateway tests — the LLM is mocked by swapping `globalThis.fetch`, which is the
 * only seam `complete()` uses to reach a provider. No network, no keys.
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { complete, stripJsonFences, getAiConfig, AiConfigError } from './gateway.ts';

const Schema = z.object({ verdict: z.string(), confidence: z.number() });

type Body = { temperature: number; model: string };

const realFetch = globalThis.fetch;
const realEnv = { ...process.env };

/** Replace fetch with a stub that replays `contents`, one per attempt. */
function mockLlm(contents: string[]) {
  const calls: Body[] = [];
  globalThis.fetch = (async (_url: string, init: RequestInit) => {
    calls.push(JSON.parse(String(init.body)) as Body);
    const content = contents[Math.min(calls.length - 1, contents.length - 1)];
    return new Response(
      JSON.stringify({ choices: [{ message: { content } }], usage: { total_tokens: 1234 } }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  }) as unknown as typeof fetch;
  return calls;
}

beforeEach(() => {
  process.env.AI_BASE_URL = 'https://api.example.test/v1';
  process.env.AI_API_KEY = 'test-key';
  process.env.AI_MODEL = 'gpt-4o';
});

afterEach(() => {
  globalThis.fetch = realFetch;
  process.env = { ...realEnv };
});

describe('stripJsonFences', () => {
  it('unwraps a ```json fence', () => {
    assert.equal(stripJsonFences('```json\n{"a":1}\n```'), '{"a":1}');
  });

  it('unwraps a bare ``` fence', () => {
    assert.equal(stripJsonFences('```\n{"a":1}\n```'), '{"a":1}');
  });

  it('drops preamble prose around the object', () => {
    assert.equal(stripJsonFences('Sure! Here you go: {"a":1} — hope that helps.'), '{"a":1}');
  });

  it('leaves clean JSON untouched', () => {
    assert.equal(stripJsonFences('{"a":1}'), '{"a":1}');
  });
});

describe('getAiConfig', () => {
  it('throws a typed AiConfigError naming what is missing', () => {
    delete process.env.AI_API_KEY;
    assert.throws(
      () => getAiConfig(),
      (err: unknown) => err instanceof AiConfigError && err.missing.includes('AI_API_KEY'),
    );
  });

  it('derives the provider label from the base URL host, naming no provider in code', () => {
    process.env.AI_BASE_URL = 'https://api.avalai.ir/v1';
    assert.equal(getAiConfig().provider, 'api.avalai.ir');
  });

  it('reads ONLY the canonical names — the retired AI_HA_* names do not configure it', () => {
    delete process.env.AI_BASE_URL;
    process.env.AI_HA_BASE_URL = 'https://api.ai-ha.ir/v1';
    assert.throws(
      () => getAiConfig(),
      (err: unknown) => err instanceof AiConfigError && err.missing.includes('AI_BASE_URL'),
    );
  });
});

describe('complete', () => {
  it('parses valid JSON on the first attempt', async () => {
    const calls = mockLlm(['{"verdict":"verified","confidence":0.9}']);
    const result = await complete('test', 'prompt', Schema);

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.data, { verdict: 'verified', confidence: 0.9 });
    assert.equal(result.meta.attempts, 1);
    assert.equal(result.meta.totalTokens, 1234);
    assert.equal(calls.length, 1);
  });

  it('parses JSON the model wrapped in markdown fences', async () => {
    mockLlm(['```json\n{"verdict":"verified","confidence":0.8}\n```']);
    const result = await complete('test', 'prompt', Schema);

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.data.confidence, 0.8);
  });

  it('retries exactly once at temperature 0, then fails cleanly on malformed JSON', async () => {
    const calls = mockLlm(['this is not json at all']);
    const result = await complete('test', 'prompt', Schema);

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.code, 'invalid_json');
    assert.equal(calls.length, 2, 'retries exactly once — no infinite loop');
    assert.equal(calls[1].temperature, 0, 'the retry drops to temperature 0');
    assert.equal(result.meta.attempts, 2);
  });

  it('succeeds on the retry when the second response is valid', async () => {
    const calls = mockLlm(['garbage', '{"verdict":"insufficient","confidence":0}']);
    const result = await complete('test', 'prompt', Schema);

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.data.verdict, 'insufficient');
    assert.equal(calls.length, 2);
  });

  it('retries once then fails when JSON parses but does not match the schema', async () => {
    const calls = mockLlm(['{"verdict":"verified"}']); // confidence missing
    const result = await complete('test', 'prompt', Schema);

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.code, 'schema_mismatch');
    assert.equal(calls.length, 2);
  });

  it('returns a typed failure instead of throwing when the gateway is unconfigured', async () => {
    delete process.env.AI_API_KEY;
    const calls = mockLlm(['{"verdict":"verified","confidence":1}']);
    const result = await complete('test', 'prompt', Schema);

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.code, 'config_missing');
    assert.equal(calls.length, 0, 'never reaches the provider');
  });

  it('does not retry transport failures', async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      return new Response('nope', { status: 401 });
    }) as unknown as typeof fetch;

    const result = await complete('test', 'prompt', Schema);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.code, 'http_error');
    assert.equal(calls, 1, 'a 401 is not worth a second 30-second attempt');
  });
});
