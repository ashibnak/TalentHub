import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { scoreFromBreakdown, weekWindow, EMPTY_BREAKDOWN, POINTS } from './scoring.ts';

describe('scoreFromBreakdown', () => {
  it('is zero for an empty breakdown', () => {
    assert.equal(scoreFromBreakdown(EMPTY_BREAKDOWN), 0);
  });

  it('applies each weight', () => {
    assert.equal(
      scoreFromBreakdown({ publishProject: 2, challengeSubmission: 1, upvoteReceived: 3, spotlightWin: 1 }),
      2 * POINTS.publishProject + 1 * POINTS.challengeSubmission + 3 * POINTS.upvoteReceived + 1 * POINTS.spotlightWin,
    );
  });
});

describe('weekWindow', () => {
  it('spans exactly 7 days', () => {
    const w = weekWindow(0, new Date('2026-07-23T09:00:00Z')); // a Thursday
    assert.equal(w.end.getTime() - w.start.getTime(), 7 * 86_400_000);
  });

  it('starts on Saturday 00:00 Tehran (Friday 20:30 UTC)', () => {
    // 2026-07-23 is a Thursday; its week started Saturday 2026-07-18.
    // Saturday 00:00 Tehran == Friday 2026-07-17 20:30 UTC.
    const w = weekWindow(0, new Date('2026-07-23T09:00:00Z'));
    assert.equal(w.start.toISOString(), '2026-07-17T20:30:00.000Z');
  });

  it('a moment just after the boundary belongs to the new week', () => {
    // Saturday 2026-07-18 00:00 Tehran exactly == start of that week.
    const boundary = new Date('2026-07-17T20:30:00.000Z');
    const w = weekWindow(0, boundary);
    assert.equal(w.start.toISOString(), '2026-07-17T20:30:00.000Z');
  });

  it('a moment just before the boundary belongs to the previous week', () => {
    const justBefore = new Date('2026-07-17T20:29:59.000Z');
    const w = weekWindow(0, justBefore);
    assert.equal(w.start.toISOString(), '2026-07-10T20:30:00.000Z');
  });

  it('offset -1 is the previous Saturday→Saturday week', () => {
    const w = weekWindow(-1, new Date('2026-07-23T09:00:00Z'));
    assert.equal(w.start.toISOString(), '2026-07-10T20:30:00.000Z');
    assert.equal(w.end.toISOString(), '2026-07-17T20:30:00.000Z');
  });
});
