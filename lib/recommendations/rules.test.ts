import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  LEARNING_LEVEL_MAX,
  WEIGHTS,
  primaryReason,
  readinessLevel,
  recommend,
  scoreLesson,
  type UserSignals,
} from './rules.ts';
import type { Lesson } from '@/lib/lessons/rules';

const res = (slug: string, topics: string[], over: Partial<Lesson> = {}): Lesson & { topics: string[] } => ({
  slug,
  provider: 'Provider',
  title: `title ${slug}`,
  description: 'desc',
  url: `https://example.test/${slug}`,
  kind: 'course',
  level: 'intermediate',
  audience: 'all',
  durationMinutes: null,
  topics,
  ...over,
});

const signals = (over: Partial<UserSignals> = {}): UserSignals => ({
  role: 'builder',
  skills: [],
  domains: [],
  projectSkills: [],
  verificationGaps: [],
  ...over,
});

describe('readinessLevel', () => {
  it('is beginner with no skills at all', () => {
    assert.equal(readinessLevel(signals()), 'beginner');
  });

  it('is beginner at level 1', () => {
    assert.equal(readinessLevel(signals({ skills: [{ slug: 'a', claimedLevel: 1, verified: false }] })), 'beginner');
  });

  it('is intermediate from level 2', () => {
    assert.equal(readinessLevel(signals({ skills: [{ slug: 'a', claimedLevel: 2, verified: false }] })), 'intermediate');
  });

  it('is advanced only from level 4', () => {
    assert.equal(readinessLevel(signals({ skills: [{ slug: 'a', claimedLevel: 3, verified: true }] })), 'intermediate');
    assert.equal(readinessLevel(signals({ skills: [{ slug: 'a', claimedLevel: 4, verified: true }] })), 'advanced');
  });

  it('uses the STRONGEST claim, not the average', () => {
    const s = signals({
      skills: [
        { slug: 'a', claimedLevel: 1, verified: false },
        { slug: 'b', claimedLevel: 5, verified: true },
      ],
    });
    assert.equal(readinessLevel(s), 'advanced');
  });
});

describe('scoreLesson — signal weighting', () => {
  it('scores a verification gap highest of all signals', () => {
    const gap = scoreLesson(res('l', ['pytorch']), signals({ verificationGaps: ['pytorch'] }));
    const claimed = scoreLesson(
      res('l', ['pytorch']),
      signals({ skills: [{ slug: 'pytorch', claimedLevel: 5, verified: true }] }),
    );
    assert.ok(gap.score > claimed.score, 'the platform’s own unmet promise outranks a settled claim');
    assert.ok(gap.reasons.some((r) => r.kind === 'verification_gap'));
  });

  it('treats a low-level unverified skill as "still learning"', () => {
    const s = scoreLesson(
      res('l', ['docker']),
      signals({ skills: [{ slug: 'docker', claimedLevel: LEARNING_LEVEL_MAX, verified: false }] }),
    );
    assert.ok(s.reasons.some((r) => r.kind === 'low_level_skill'));
  });

  it('treats a verified skill as settled, not as a learning need', () => {
    const s = scoreLesson(
      res('l', ['docker']),
      signals({ skills: [{ slug: 'docker', claimedLevel: 2, verified: true }] }),
    );
    assert.ok(s.reasons.some((r) => r.kind === 'claimed_skill'));
    assert.ok(!s.reasons.some((r) => r.kind === 'low_level_skill'));
  });

  it('matches topics case-insensitively', () => {
    const s = scoreLesson(res('l', ['PyTorch']), signals({ verificationGaps: ['pytorch'] }));
    assert.ok(s.score >= WEIGHTS.verificationGap);
  });

  it('credits a domain match, which is often a Domain Expert’s only signal', () => {
    const s = scoreLesson(res('l', ['hr']), signals({ role: 'domain_expert', domains: ['hr'] }));
    assert.ok(s.reasons.some((r) => r.kind === 'domain'));
  });

  it('adds level fit when the resource matches readiness', () => {
    const s = scoreLesson(
      res('l', ['x'], { level: 'advanced' }),
      signals({ skills: [{ slug: 'x', claimedLevel: 5, verified: true }] }),
    );
    assert.ok(s.reasons.some((r) => r.kind === 'level_fit'));
  });

  it('gives no role point for audience "all"', () => {
    const s = scoreLesson(res('l', ['x'], { audience: 'all' }), signals({ skills: [{ slug: 'x', claimedLevel: 3, verified: false }] }));
    assert.ok(!s.reasons.some((r) => r.kind === 'role_fit'));
  });

  it('accumulates several signals for the same resource', () => {
    const s = scoreLesson(
      res('l', ['pytorch']),
      signals({
        verificationGaps: ['pytorch'],
        projectSkills: ['pytorch'],
        skills: [{ slug: 'pytorch', claimedLevel: 2, verified: false }],
      }),
    );
    assert.ok(s.score >= WEIGHTS.verificationGap + WEIGHTS.projectSkill + WEIGHTS.lowLevelSkill);
  });
});

describe('recommend — ranking and filtering', () => {
  const pool = [
    res('gap-match', ['pytorch']),
    res('project-match', ['docker']),
    res('unrelated', ['woodworking']),
    res('domain-match', ['hr']),
  ];

  it('ranks the verification gap first', () => {
    const out = recommend(pool, signals({ verificationGaps: ['pytorch'], projectSkills: ['docker'] }));
    assert.equal(out[0].lesson.slug, 'gap-match');
  });

  it('DROPS resources with no topic match, however well they fit otherwise', () => {
    const out = recommend(pool, signals({ verificationGaps: ['pytorch'] }));
    assert.ok(!out.some((s) => s.lesson.slug === 'unrelated'), 'generic filler trains people to ignore the block');
  });

  it('returns nothing when no signal matches anything', () => {
    assert.deepEqual(recommend(pool, signals()), []);
  });

  it('excludes resources already shown elsewhere on the page', () => {
    const out = recommend(pool, signals({ verificationGaps: ['pytorch'] }), { exclude: ['gap-match'] });
    assert.ok(!out.some((s) => s.lesson.slug === 'gap-match'));
  });

  it('respects the audience gate', () => {
    const deOnly = [res('de', ['pytorch'], { audience: 'domain_expert' })];
    assert.deepEqual(recommend(deOnly, signals({ role: 'builder', verificationGaps: ['pytorch'] })), []);
    assert.equal(recommend(deOnly, signals({ role: 'hybrid', verificationGaps: ['pytorch'] })).length, 1);
  });

  it('honours the count limit', () => {
    const many = ['a', 'b', 'c', 'd', 'e'].map((k) => res(k, ['pytorch']));
    assert.equal(recommend(many, signals({ verificationGaps: ['pytorch'] }), { count: 2 }).length, 2);
  });

  it('breaks ties by slug so the order is stable between renders', () => {
    const tied = [res('zebra', ['pytorch']), res('alpha', ['pytorch'])];
    const out = recommend(tied, signals({ verificationGaps: ['pytorch'] }));
    assert.deepEqual(out.map((s) => s.lesson.slug), ['alpha', 'zebra']);
  });
});

describe('primaryReason', () => {
  it('prefers the verification gap over every weaker reason', () => {
    const s = scoreLesson(
      res('l', ['pytorch']),
      signals({ verificationGaps: ['pytorch'], projectSkills: ['pytorch'], domains: ['pytorch'] }),
    );
    assert.equal(primaryReason(s)?.kind, 'verification_gap');
  });

  it('falls back through the priority order', () => {
    const s = scoreLesson(res('l', ['docker']), signals({ projectSkills: ['docker'] }));
    assert.equal(primaryReason(s)?.kind, 'project_skill');
  });

  it('is null when there were no reasons at all', () => {
    assert.equal(primaryReason({ lesson: res('l', []), score: 0, reasons: [] }), null);
  });
});
