import test from 'node:test';
import assert from 'node:assert/strict';
import { parseOnboardingForm } from './rules.ts';

const fd = (entries: Record<string, string | string[]>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) {
    if (Array.isArray(v)) for (const item of v) f.append(k, item);
    else f.set(k, v);
  }
  return f;
};

test('builder happy path: no domains required, github kept', () => {
  const r = parseOnboardingForm(
    fd({ choice: 'builder', roleTitle: 'مهندس نرم‌افزار', githubUsername: '@octocat', confidence: 'high', destination: 'new_project' }),
  );
  assert.ok(!('error' in r));
  if (!('error' in r)) {
    assert.equal(r.githubUsername, 'octocat');
    assert.deepEqual(r.domains, []);
  }
});

test('domain_expert without domains -> domains_required', () => {
  const r = parseOnboardingForm(fd({ choice: 'domain_expert', confidence: 'medium', destination: 'challenges' }));
  assert.deepEqual(r, { error: 'domains_required' });
});

test('domain_expert with domains + per-domain years parses', () => {
  const r = parseOnboardingForm(
    fd({ choice: 'domain_expert', domains: ['hr', 'finance'], years_hr: '10', confidence: 'low', destination: 'people' }),
  );
  assert.ok(!('error' in r));
  if (!('error' in r)) {
    assert.deepEqual(r.domains, [
      { slug: 'hr', years: 10 },
      { slug: 'finance', years: null },
    ]);
  }
});

test('years out of range / float are clamped, never an error', () => {
  const r = parseOnboardingForm(
    fd({ choice: 'domain_expert', domains: ['hr', 'finance'], years_hr: '99', years_finance: '2.5', confidence: 'unknown', destination: 'home' }),
  );
  assert.ok(!('error' in r));
  if (!('error' in r)) {
    assert.deepEqual(r.domains, [
      { slug: 'hr', years: 50 },
      { slug: 'finance', years: 2 },
    ]);
  }
});

test('github: trailing/consecutive hyphens rejected', () => {
  for (const bad of ['octocat-', 'octo--cat']) {
    const r = parseOnboardingForm(fd({ choice: 'builder', githubUsername: bad, confidence: 'unknown', destination: 'home' }));
    assert.deepEqual(r, { error: 'github' }, bad);
  }
});

test('bad github -> github code', () => {
  const r = parseOnboardingForm(
    fd({ choice: 'builder', githubUsername: '-bad-handle-', confidence: 'unknown', destination: 'home' }),
  );
  assert.deepEqual(r, { error: 'github' });
});

test('hybrid keeps skills + domains', () => {
  const r = parseOnboardingForm(
    fd({ choice: 'hybrid', domains: ['product'], skills: ['python', 'react', 'python'], confidence: 'high', destination: 'home' }),
  );
  assert.ok(!('error' in r));
  if (!('error' in r)) assert.deepEqual(r.skillSlugs, ['python', 'react']);
});
