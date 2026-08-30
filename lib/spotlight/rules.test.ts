import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  SPOTLIGHT_DAYS,
  canPickWinner,
  canSpotlight,
  daysRemaining,
  isExpired,
  spotlightWindow,
  type SpotlightProblem,
} from './rules.ts';

const problem = (over: Partial<SpotlightProblem> = {}): SpotlightProblem => ({
  id: 'problem-1',
  status: 'active',
  isSpotlight: false,
  spotlightEndsAt: null,
  spotlightWinnerProjectId: null,
  ...over,
});

const DAY = 86_400_000;

describe('canSpotlight', () => {
  it('allows an active problem when nothing is spotlighted (happy path)', () => {
    assert.equal(canSpotlight(problem(), null), null);
  });

  it('rejects a second spotlight while one is already running', () => {
    assert.equal(
      canSpotlight(problem({ id: 'problem-2' }), { id: 'problem-1' }),
      'spotlight_taken',
      'DESIGN_SYSTEM §5.8: banners must never stack, so two live spotlights can never exist',
    );
  });

  it('distinguishes re-spotlighting the SAME problem from taking a busy slot', () => {
    assert.equal(canSpotlight(problem({ id: 'problem-1' }), { id: 'problem-1' }), 'already_spotlight');
  });

  it('rejects every non-active status', () => {
    for (const status of ['pending_review', 'resolved', 'archived', 'rejected'] as const) {
      assert.equal(
        canSpotlight(problem({ status }), null),
        'problem_not_active',
        `${status} must not be spotlightable`,
      );
    }
  });

  it('reports a missing problem', () => {
    assert.equal(canSpotlight(null, null), 'problem_not_found');
  });

  it('checks status before slot availability', () => {
    // An archived problem is wrong regardless of whether the slot is free.
    assert.equal(canSpotlight(problem({ status: 'archived' }), { id: 'other' }), 'problem_not_active');
  });
});

describe('spotlightWindow', () => {
  it('starts now and ends seven days later', () => {
    const now = new Date('2026-08-29T06:30:00.000Z');
    const w = spotlightWindow(now);
    assert.equal(w.startsAt.getTime(), now.getTime());
    assert.equal(w.endsAt.getTime() - w.startsAt.getTime(), SPOTLIGHT_DAYS * DAY);
  });
});

describe('isExpired', () => {
  const now = new Date('2026-08-29T12:00:00.000Z');

  it('is false while the window is open', () => {
    assert.equal(isExpired({ spotlightEndsAt: new Date(now.getTime() + DAY) }, now), false);
  });

  it('is true once the end instant has passed', () => {
    assert.equal(isExpired({ spotlightEndsAt: new Date(now.getTime() - 1) }, now), true);
  });

  it('is true exactly at the end instant (end is exclusive)', () => {
    assert.equal(isExpired({ spotlightEndsAt: new Date(now.getTime()) }, now), true);
  });

  it('is false for a problem that was never spotlighted', () => {
    assert.equal(isExpired({ spotlightEndsAt: null }, now), false);
  });
});

describe('daysRemaining', () => {
  it('counts whole days across a normal week', () => {
    const now = new Date('2026-08-29T09:00:00.000Z'); // 12:30 Tehran, Saturday
    assert.equal(daysRemaining({ spotlightEndsAt: new Date('2026-09-05T09:00:00.000Z') }, now), 7);
    assert.equal(daysRemaining({ spotlightEndsAt: new Date('2026-09-01T09:00:00.000Z') }, now), 3);
  });

  it('returns 0 on the final Tehran day rather than going negative', () => {
    const now = new Date('2026-08-29T09:00:00.000Z'); // 12:30 Tehran, the 29th
    // 19:00 UTC is 22:30 Tehran — still the 29th, so nothing is left after today.
    assert.equal(daysRemaining({ spotlightEndsAt: new Date('2026-08-29T19:00:00.000Z') }, now), 0);
    // Long past — floored at 0, never negative.
    assert.equal(daysRemaining({ spotlightEndsAt: new Date('2026-08-20T09:00:00.000Z') }, now), 0);
  });

  it('still shows a day left when the end instant lands after Tehran midnight', () => {
    // 23:00 UTC on the 29th is 02:30 Tehran on the 30th: the window really does
    // run into tomorrow, so «۱ روز باقی مانده» is the honest label.
    const now = new Date('2026-08-29T09:00:00.000Z');
    assert.equal(daysRemaining({ spotlightEndsAt: new Date('2026-08-29T23:00:00.000Z') }, now), 1);
  });

  it('counts TEHRAN calendar days, not 24-hour chunks, across a day boundary', () => {
    // 20:45 UTC on the 29th is already 00:15 Tehran on the 30th. An end instant
    // of 21:30 UTC (01:00 Tehran on the 31st) is one Tehran day away, even
    // though barely 24h separate the two instants.
    const now = new Date('2026-08-29T20:45:00.000Z');
    const endsAt = new Date('2026-08-30T21:30:00.000Z');
    assert.equal(daysRemaining({ spotlightEndsAt: endsAt }, now), 1);
  });

  it('does not roll over early: 20:00 UTC is still the same Tehran day as 19:00', () => {
    // Both are before 20:30 UTC (= Tehran midnight), so both sit on the 29th.
    const endsAt = new Date('2026-09-01T09:00:00.000Z');
    const early = daysRemaining({ spotlightEndsAt: endsAt }, new Date('2026-08-29T19:00:00.000Z'));
    const late = daysRemaining({ spotlightEndsAt: endsAt }, new Date('2026-08-29T20:00:00.000Z'));
    assert.equal(early, late);
    assert.equal(early, 3);
  });

  it('crosses the Saturday week boundary correctly', () => {
    // Friday 21:00 UTC = Saturday 00:30 Tehran — a new Tehran week has begun.
    const friday = new Date('2026-09-04T21:00:00.000Z');
    assert.equal(daysRemaining({ spotlightEndsAt: new Date('2026-09-06T09:00:00.000Z') }, friday), 1);
  });

  it('returns 0 when the problem was never spotlighted', () => {
    assert.equal(daysRemaining({ spotlightEndsAt: null }), 0);
  });
});

describe('canPickWinner', () => {
  const now = new Date('2026-09-06T12:00:00.000Z');
  const closed = problem({ spotlightEndsAt: new Date('2026-09-05T12:00:00.000Z') });

  it('allows a linked project once the window has closed (happy path)', () => {
    assert.equal(canPickWinner(closed, 'project-1', ['project-1', 'project-2'], now), null);
  });

  it('rejects a project that was never submitted to this problem', () => {
    assert.equal(
      canPickWinner(closed, 'project-99', ['project-1', 'project-2'], now),
      'project_not_linked',
      'the badge and 50 points reward an actual submission',
    );
  });

  it('rejects any winner while the window is still open', () => {
    const open = problem({ spotlightEndsAt: new Date('2026-09-07T12:00:00.000Z') });
    assert.equal(canPickWinner(open, 'project-1', ['project-1'], now), 'window_open');
  });

  it('rejects a problem that was never spotlighted', () => {
    assert.equal(canPickWinner(problem(), 'project-1', ['project-1'], now), 'not_spotlighted');
  });

  it('refuses to overwrite a winner that is already recorded', () => {
    const decided = problem({
      spotlightEndsAt: new Date('2026-09-05T12:00:00.000Z'),
      spotlightWinnerProjectId: 'project-2',
    });
    assert.equal(canPickWinner(decided, 'project-1', ['project-1', 'project-2'], now), 'winner_already_picked');
  });

  it('rejects an empty candidate list', () => {
    assert.equal(canPickWinner(closed, 'project-1', [], now), 'project_not_linked');
  });

  it('reports a missing problem', () => {
    assert.equal(canPickWinner(null, 'project-1', ['project-1'], now), 'problem_not_found');
  });
});
