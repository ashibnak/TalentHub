import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isDayOne, nextRankMilestone, scoreDelta, weakestUnverified } from './rules.ts';

describe('isDayOne', () => {
  it('is true only with zero projects AND zero ideas', () => {
    assert.equal(isDayOne({ projectCount: 0, ideaCount: 0 }), true);
  });

  it('is false once there is a single project', () => {
    assert.equal(isDayOne({ projectCount: 1, ideaCount: 0 }), false);
  });

  it('is false once there is a single idea — AND, not OR', () => {
    assert.equal(
      isDayOne({ projectCount: 0, ideaCount: 1 }),
      false,
      'someone with an idea has real numbers to look at, so they get the real dashboard',
    );
  });

  it('is false when both exist', () => {
    assert.equal(isDayOne({ projectCount: 3, ideaCount: 2 }), false);
  });
});

describe('nextRankMilestone', () => {
  it('reports the points needed to overtake the person above', () => {
    const m = nextRankMilestone({ rank: 4, score: 30, scoreAhead: 44 });
    assert.deepEqual(m, { pointsNeeded: 15, targetRank: 3 });
  });

  it('is omitted at rank 1 — there is nothing above to chase', () => {
    assert.equal(nextRankMilestone({ rank: 1, score: 120, scoreAhead: null }), null);
  });

  it('is omitted with no score yet — that member needs an invitation, not a gap', () => {
    assert.equal(nextRankMilestone({ rank: 9, score: 0, scoreAhead: 20 }), null);
  });

  it('is omitted when nobody above is known', () => {
    assert.equal(nextRankMilestone({ rank: 5, score: 10, scoreAhead: null }), null);
  });

  it('asks for exactly one point to break a tie', () => {
    // Tied on score but ranked below: one more point genuinely overtakes them.
    assert.deepEqual(nextRankMilestone({ rank: 3, score: 40, scoreAhead: 40 }), {
      pointsNeeded: 1,
      targetRank: 2,
    });
  });

  it('is omitted when the person above somehow scores less', () => {
    assert.equal(nextRankMilestone({ rank: 3, score: 50, scoreAhead: 40 }), null);
  });

  it('needs two points to clear a one-point gap', () => {
    assert.deepEqual(nextRankMilestone({ rank: 2, score: 41, scoreAhead: 42 }), {
      pointsNeeded: 2,
      targetRank: 1,
    });
  });
});

describe('scoreDelta', () => {
  it('is positive on a rise and negative on a fall', () => {
    assert.equal(scoreDelta(50, 30), 20);
    assert.equal(scoreDelta(30, 50), -20);
    assert.equal(scoreDelta(30, 30), 0);
  });
});

describe('weakestUnverified', () => {
  const names = new Map([
    ['python', 'Python'],
    ['docker', 'Docker'],
  ]);
  const v = (slug: string, confidence: number) => ({
    skill_slug: slug,
    confidence,
    evidence: `evidence for ${slug}`,
    verdict: confidence >= 0.7 ? 'verified' : 'insufficient',
  });

  it('picks the lowest-confidence failing skill, not just the first', () => {
    const gap = weakestUnverified([v('python', 0.6), v('docker', 0.2)], 0.7, names);
    assert.equal(gap?.skillSlug, 'docker');
    assert.equal(gap?.skillName, 'Docker', 'resolves the slug to a human name');
  });

  it('returns null when everything cleared the bar', () => {
    assert.equal(weakestUnverified([v('python', 0.9), v('docker', 0.8)], 0.7, names), null);
  });

  it('falls back to the slug when the skill name is unknown', () => {
    const gap = weakestUnverified([v('rust', 0.1)], 0.7, names);
    assert.equal(gap?.skillName, 'rust');
  });

  it('returns null for an empty verification list', () => {
    assert.equal(weakestUnverified([], 0.7, names), null);
  });

  it('treats a skill exactly at the threshold as passing', () => {
    assert.equal(weakestUnverified([v('python', 0.7)], 0.7, names), null);
  });
});
