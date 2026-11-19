import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  charterIsComplete,
  nextOrbitStage,
  orbitAdvanceError,
  readScores,
  statusAfterAdvance,
  type OrbitScores,
  type PilotCharter,
} from './orbit.ts';

const SCORES: OrbitScores = { problem: 4, agentFit: 5, prototype: 3, security: 4, measurable: 5, implement: 3 };

const CHARTER: PilotCharter = {
  goal: 'کاهش زمان پاسخ در یک تیم',
  scope: 'فقط درخواست‌های مرخصی',
  users: 'ده کارشناس منابع انسانی',
  metrics: 'زمان تأیید از دو روز به چهار ساعت',
  risks: 'دسترسی به سامانه‌ی حضور ممکن است دیر برسد',
  decision: 'continue',
};

describe('nextOrbitStage', () => {
  it('walks the eight stages in order and stops at the end', () => {
    assert.equal(nextOrbitStage('signal'), 'screening');
    assert.equal(nextOrbitStage('demo'), 'pilot');
    assert.equal(nextOrbitStage('next'), null);
  });
});

describe('orbitAdvanceError', () => {
  it('refuses a stage skip and an idea that was never submitted', () => {
    assert.equal(orbitAdvanceError({ from: null, to: 'screening', scores: null, pitchUrl: null, charter: null }), 'not_started');
    assert.equal(
      orbitAdvanceError({ from: 'signal', to: 'clinic', scores: null, pitchUrl: null, charter: null }),
      'not_next',
    );
  });

  it('lets signal move to screening with no extra evidence', () => {
    assert.equal(orbitAdvanceError({ from: 'signal', to: 'screening', scores: null, pitchUrl: null, charter: null }), null);
  });

  it('demands a full 1–5 scorecard to leave screening', () => {
    assert.equal(
      orbitAdvanceError({ from: 'screening', to: 'clinic', scores: null, pitchUrl: null, charter: null }),
      'scores_required',
    );
    assert.equal(orbitAdvanceError({ from: 'screening', to: 'clinic', scores: SCORES, pitchUrl: null, charter: null }), null);
  });

  it('demands a deck link to leave the pitch, a charter to enter the pilot, and continue to leave it', () => {
    assert.equal(
      orbitAdvanceError({ from: 'pitch', to: 'lab', scores: null, pitchUrl: null, charter: null }),
      'pitch_required',
    );
    assert.equal(
      orbitAdvanceError({ from: 'pitch', to: 'lab', scores: null, pitchUrl: 'https://example.com/deck', charter: null }),
      null,
    );
    assert.equal(
      orbitAdvanceError({ from: 'demo', to: 'pilot', scores: null, pitchUrl: null, charter: null }),
      'charter_required',
    );
    assert.equal(
      orbitAdvanceError({ from: 'demo', to: 'pilot', scores: null, pitchUrl: null, charter: CHARTER }),
      null,
    );
    assert.equal(
      orbitAdvanceError({ from: 'pilot', to: 'next', scores: null, pitchUrl: null, charter: { ...CHARTER, decision: 'stop' } }),
      'continue_required',
    );
    assert.equal(
      orbitAdvanceError({ from: 'pilot', to: 'next', scores: null, pitchUrl: null, charter: CHARTER }),
      null,
    );
  });
});

describe('statusAfterAdvance', () => {
  it('approves the idea when it is selected into the lab', () => {
    assert.equal(statusAfterAdvance('lab', 'submitted'), 'approved');
    assert.equal(statusAfterAdvance('screening', 'submitted'), 'submitted');
  });
});

describe('readScores', () => {
  it('rejects a missing or out-of-range score', () => {
    const fd = new FormData();
    for (const [key, value] of Object.entries({ problem: '4', agentFit: '5', prototype: '3', security: '6', measurable: '2', implement: '1' })) {
      fd.set(`score_${key}`, value);
    }
    assert.equal(readScores(fd), null);
  });
});

describe('charterIsComplete', () => {
  it('requires each charter line to say something', () => {
    assert.equal(charterIsComplete(CHARTER), true);
    assert.equal(charterIsComplete({ ...CHARTER, risks: 'کوتاه' }), false);
  });
});
