import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  charterIsComplete,
  clinicIsReady,
  nextOrbitStage,
  orbitAdvanceError,
  managerPitchIsReady,
  readDemoScores,
  readScores,
  statusAfterAdvance,
  type OrbitScores,
  type PilotCharter,
} from './orbit.ts';

const SCORES: OrbitScores = { problem: 4, agentFit: 5, prototype: 3, security: 4, measurable: 5, implement: 3 };
const DEMO = { function: 4, value: 5, security: 3, readiness: 4 };

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
    assert.equal(
      orbitAdvanceError({ from: null, to: 'screening', scores: null, clinicReady: false, pitchUrl: null, demoLinked: false, demoScores: null, charter: null }),
      'not_started',
    );
    assert.equal(
      orbitAdvanceError({ from: 'signal', to: 'clinic', scores: null, clinicReady: false, pitchUrl: null, demoLinked: false, demoScores: null, charter: null }),
      'not_next',
    );
  });

  it('lets signal move to screening with no extra evidence', () => {
    assert.equal(
      orbitAdvanceError({ from: 'signal', to: 'screening', scores: null, clinicReady: false, pitchUrl: null, demoLinked: false, demoScores: null, charter: null }),
      null,
    );
  });

  it('demands a full 1–5 scorecard to leave screening', () => {
    assert.equal(
      orbitAdvanceError({ from: 'screening', to: 'clinic', scores: null, clinicReady: false, pitchUrl: null, demoLinked: false, demoScores: null, charter: null }),
      'scores_required',
    );
    assert.equal(
      orbitAdvanceError({ from: 'screening', to: 'clinic', scores: SCORES, clinicReady: false, pitchUrl: null, demoLinked: false, demoScores: null, charter: null }),
      null,
    );
  });

  it('demands a clinic, a deck, a linked project, a charter, and continue', () => {
    assert.equal(
      orbitAdvanceError({ from: 'clinic', to: 'pitch', scores: null, clinicReady: false, pitchUrl: null, demoLinked: false, demoScores: null, charter: null }),
      'clinic_required',
    );
    assert.equal(
      orbitAdvanceError({ from: 'clinic', to: 'pitch', scores: null, clinicReady: true, pitchUrl: null, demoLinked: false, demoScores: null, charter: null }),
      null,
    );
    assert.equal(
      orbitAdvanceError({ from: 'pitch', to: 'lab', scores: null, clinicReady: false, pitchUrl: null, demoLinked: false, demoScores: null, charter: null }),
      'pitch_required',
    );
    assert.equal(
      orbitAdvanceError({ from: 'pitch', to: 'lab', scores: null, clinicReady: false, pitchUrl: 'https://example.com/deck', demoLinked: false, demoScores: null, charter: null }),
      null,
    );
    assert.equal(
      orbitAdvanceError({ from: 'demo', to: 'pilot', scores: null, clinicReady: false, pitchUrl: null, demoLinked: false, demoScores: null, charter: CHARTER }),
      'demo_required',
    );
    assert.equal(
      orbitAdvanceError({ from: 'demo', to: 'pilot', scores: null, clinicReady: false, pitchUrl: null, demoLinked: true, demoScores: null, charter: CHARTER }),
      'demo_scores_required',
    );
    assert.equal(
      orbitAdvanceError({ from: 'demo', to: 'pilot', scores: null, clinicReady: false, pitchUrl: null, demoLinked: true, demoScores: DEMO, charter: null }),
      'charter_required',
    );
    assert.equal(
      orbitAdvanceError({ from: 'demo', to: 'pilot', scores: null, clinicReady: false, pitchUrl: null, demoLinked: true, demoScores: DEMO, charter: CHARTER }),
      null,
    );
    assert.equal(
      orbitAdvanceError({
        from: 'pilot',
        to: 'next',
        scores: null,
        clinicReady: false,
        pitchUrl: null,
        demoLinked: false,
        demoScores: null,
        charter: { ...CHARTER, decision: 'stop' },
      }),
      'continue_required',
    );
    assert.equal(
      orbitAdvanceError({ from: 'pilot', to: 'next', scores: null, clinicReady: false, pitchUrl: null, demoLinked: false, demoScores: null, charter: CHARTER }),
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

describe('managerPitchIsReady', () => {
  it('needs a date and a short audience', () => {
    assert.equal(managerPitchIsReady(new Date('2026-11-19T12:00:00Z'), 'مدیران فناپ'), true);
    assert.equal(managerPitchIsReady(null, 'مدیران فناپ'), false);
    assert.equal(managerPitchIsReady(new Date('2026-11-19T12:00:00Z'), 'ا'), false);
  });
});

describe('readDemoScores', () => {
  it('rejects a missing demo score', () => {
    const fd = new FormData();
    fd.set('demo_function', '4');
    fd.set('demo_value', '5');
    fd.set('demo_security', '3');
    assert.equal(readDemoScores(fd), null);
  });
});

describe('clinicIsReady', () => {
  it('needs a real date and a note of at least ten characters', () => {
    assert.equal(clinicIsReady(new Date('2026-11-19T12:00:00Z'), 'یادداشت کارگاه برای تیم'), true);
    assert.equal(clinicIsReady(null, 'یادداشت کارگاه برای تیم'), false);
    assert.equal(clinicIsReady(new Date('2026-11-19T12:00:00Z'), 'کوتاه'), false);
  });
});
