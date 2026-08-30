import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_FAILED_RUNS,
  README_MISSING_PENALTY,
  VERIFICATION_CONFIDENCE_THRESHOLD,
  VerifySkillsOutputSchema,
  readmePenalty,
  selectSkillsToVerify,
  shouldRetry,
  shouldVerify,
} from './rules.ts';
import type { ClaimedSkill } from './rules.ts';
import type { SkillVerdict } from './rules.ts';

const claimed = (over: Partial<ClaimedSkill> & { slug: string }): ClaimedSkill => ({
  skillId: `id-${over.slug}`,
  verified: false,
  verificationSource: null,
  ...over,
});

const verdict = (slug: string, confidence: number): SkillVerdict => ({
  skill_slug: slug,
  confidence,
  evidence: `evidence for ${slug}`,
  verdict: confidence >= 0.7 ? 'verified' : 'insufficient',
});

describe('selectSkillsToVerify', () => {
  it('promotes skills at or above the 0.7 threshold (happy path)', () => {
    const result = selectSkillsToVerify(
      [verdict('python', 0.92), verdict('docker', 0.7)],
      [claimed({ slug: 'python' }), claimed({ slug: 'docker' })],
    );

    assert.deepEqual(
      result.map((r) => r.slug).sort(),
      ['docker', 'python'],
    );
    assert.equal(result.find((r) => r.slug === 'python')?.evidence, 'evidence for python');
  });

  it('leaves below-threshold skills untouched — they stay claimed', () => {
    const result = selectSkillsToVerify(
      [verdict('python', 0.69), verdict('rust', 0.0)],
      [claimed({ slug: 'python' }), claimed({ slug: 'rust' })],
    );

    assert.deepEqual(result, []);
  });

  it('never touches a skill a human admin verified manually', () => {
    const result = selectSkillsToVerify(
      [verdict('sql', 0.99)],
      [claimed({ slug: 'sql', verified: true, verificationSource: 'manual' })],
    );

    assert.deepEqual(result, [], 'the model may not re-source or re-date a human decision');
  });

  it('drops verdicts for slugs the user does not claim', () => {
    const result = selectSkillsToVerify([verdict('kubernetes', 1)], [claimed({ slug: 'python' })]);
    assert.deepEqual(result, []);
  });

  it('keeps the strongest verdict when the model repeats a slug', () => {
    const result = selectSkillsToVerify(
      [verdict('python', 0.75), verdict('python', 0.95)],
      [claimed({ slug: 'python' })],
    );

    assert.equal(result.length, 1);
    assert.equal(result[0].confidence, 0.95);
  });

  it('re-promotes an already AI-verified skill without downgrading it', () => {
    const result = selectSkillsToVerify(
      [verdict('go', 0.9)],
      [claimed({ slug: 'go', verified: true, verificationSource: 'ai_repo_analysis' })],
    );

    assert.equal(result.length, 1);
  });
});

describe('shouldRetry', () => {
  it('allows auto-retry below the failsafe limit', () => {
    assert.equal(shouldRetry(0), true);
    assert.equal(shouldRetry(MAX_FAILED_RUNS - 1), true);
  });

  it('stops auto-retrying at the failsafe limit', () => {
    assert.equal(shouldRetry(MAX_FAILED_RUNS), false);
    assert.equal(shouldRetry(MAX_FAILED_RUNS + 5), false);
  });
});

describe('shouldVerify', () => {
  it('verifies at and above the threshold, not below', () => {
    assert.equal(shouldVerify(VERIFICATION_CONFIDENCE_THRESHOLD), true, 'the threshold itself passes');
    assert.equal(shouldVerify(VERIFICATION_CONFIDENCE_THRESHOLD - 0.01), false);
    assert.equal(shouldVerify(1), true);
    assert.equal(shouldVerify(0), false);
  });
});

describe('readmePenalty', () => {
  it('leaves confidence untouched when the repo has a README', () => {
    assert.equal(readmePenalty(0.9, true), 0.9);
  });

  it('subtracts the penalty when the README is missing or empty', () => {
    assert.ok(Math.abs(readmePenalty(0.9, false) - (0.9 - README_MISSING_PENALTY)) < 1e-9);
  });

  it('floors at 0 rather than going negative', () => {
    assert.equal(readmePenalty(0.1, false), 0);
    assert.equal(readmePenalty(0, false), 0);
  });

  it('can push an otherwise-passing skill below the threshold', () => {
    const raw = 0.8; // clears 0.7 on its own
    assert.equal(shouldVerify(raw), true);
    assert.equal(shouldVerify(readmePenalty(raw, false)), false, '0.8 - 0.2 = 0.6, which no longer verifies');
  });
});

describe('selectSkillsToVerify — README penalty', () => {
  it('applies the penalty before thresholding, dropping a borderline skill', () => {
    const result = selectSkillsToVerify([verdict('python', 0.8)], [claimed({ slug: 'python' })], { hasReadme: false });
    assert.deepEqual(result, [], 'a repo with no README needs 0.9+ to verify');
  });

  it('still verifies a strong skill despite the penalty', () => {
    const result = selectSkillsToVerify([verdict('python', 0.95)], [claimed({ slug: 'python' })], { hasReadme: false });
    assert.equal(result.length, 1);
    assert.ok(Math.abs(result[0].confidence - 0.75) < 1e-9, 'the STORED confidence is post-penalty');
  });

  it('defaults to no penalty when the option is omitted', () => {
    assert.equal(selectSkillsToVerify([verdict('python', 0.8)], [claimed({ slug: 'python' })]).length, 1);
  });
});

describe('VerifySkillsOutputSchema', () => {
  it('accepts a well-formed model response', () => {
    const parsed = VerifySkillsOutputSchema.safeParse({
      verifications: [{ skill_slug: 'python', confidence: 0.92, evidence: 'main.py', verdict: 'verified' }],
      summary: 'solid',
    });
    assert.equal(parsed.success, true);
  });

  it('rescales a 0-100 confidence the model emitted by mistake', () => {
    const parsed = VerifySkillsOutputSchema.safeParse({
      verifications: [{ skill_slug: 'docker', confidence: 85, evidence: 'Dockerfile', verdict: 'verified' }],
      summary: 's',
    });
    assert.equal(parsed.success, true);
    if (parsed.success) assert.ok(Math.abs(parsed.data.verifications[0].confidence - 0.85) < 1e-9);
  });

  it('rejects a verdict missing required fields', () => {
    assert.equal(VerifySkillsOutputSchema.safeParse({ verifications: [{ skill_slug: 'x' }], summary: 's' }).success, false);
  });

  it('rejects an unknown verdict value', () => {
    const parsed = VerifySkillsOutputSchema.safeParse({
      verifications: [{ skill_slug: 'x', confidence: 0.9, evidence: 'e', verdict: 'maybe' }],
      summary: 's',
    });
    assert.equal(parsed.success, false);
  });
});
