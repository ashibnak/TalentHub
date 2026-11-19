/**
 * AI Orbit stage machine. An idea enters at `signal` when the author submits.
 * An admin moves it exactly one stage forward, and some gates demand evidence:
 * a scorecard to leave screening, a clinic date and note to leave the clinic,
 * a deck link to leave the pitch, a linked project, a demo-day scorecard,
 * and a pilot charter to leave demo day, and an explicit "continue" to leave
 * the pilot.
 */

export const ORBIT_STAGES = ['signal', 'screening', 'clinic', 'pitch', 'lab', 'demo', 'pilot', 'next'] as const;
export type OrbitStage = (typeof ORBIT_STAGES)[number];

export const ORBIT_STAGE_LABEL: Record<OrbitStage, string> = {
  signal: 'ثبت مسئله',
  screening: 'ارزیابی',
  clinic: 'کارگاه ارائه',
  pitch: 'ارائه و انتخاب',
  lab: 'آزمایشگاه',
  demo: 'روز ارائه',
  pilot: 'پایلوت',
  next: 'گام بعد',
};

export type OrbitScores = {
  problem: number;
  agentFit: number;
  prototype: number;
  security: number;
  measurable: number;
  implement: number;
};

export type DemoScores = {
  function: number;
  value: number;
  security: number;
  readiness: number;
};

export type PilotCharter = {
  goal: string;
  scope: string;
  users: string;
  metrics: string;
  risks: string;
  decision: 'continue' | 'stop' | null;
};

export type OrbitAdvanceError =
  | 'not_started'
  | 'not_next'
  | 'scores_required'
  | 'clinic_required'
  | 'pitch_required'
  | 'demo_required'
  | 'demo_scores_required'
  | 'charter_required'
  | 'continue_required';

export function nextOrbitStage(stage: OrbitStage): OrbitStage | null {
  const i = ORBIT_STAGES.indexOf(stage);
  if (i < 0 || i === ORBIT_STAGES.length - 1) return null;
  return ORBIT_STAGES[i + 1];
}

function isScore(n: number): boolean {
  return Number.isInteger(n) && n >= 1 && n <= 5;
}

export function orbitAdvanceError(input: {
  from: OrbitStage | null;
  to: OrbitStage;
  scores: OrbitScores | null;
  clinicReady: boolean;
  pitchUrl: string | null;
  demoLinked: boolean;
  demoScores: DemoScores | null;
  charter: PilotCharter | null;
}): OrbitAdvanceError | null {
  if (!input.from) return 'not_started';
  if (input.to !== nextOrbitStage(input.from)) return 'not_next';
  if (input.from === 'screening') {
    const s = input.scores;
    if (!s || !Object.values(s).every(isScore)) return 'scores_required';
  }
  if (input.from === 'clinic' && !input.clinicReady) return 'clinic_required';
  if (input.from === 'pitch' && !input.pitchUrl) return 'pitch_required';
  if (input.from === 'demo' && !input.demoLinked) return 'demo_required';
  if (input.from === 'demo') {
    const d = input.demoScores;
    if (!d || !Object.values(d).every(isScore)) return 'demo_scores_required';
  }
  if (input.from === 'demo') {
    const c = input.charter;
    if (!c?.goal || !c.scope || !c.users || !c.metrics || !c.risks) return 'charter_required';
  }
  if (input.from === 'pilot') {
    if (!input.charter) return 'charter_required';
    if (input.charter.decision !== 'continue') return 'continue_required';
  }
  return null;
}

/** Entering the lab is the selection gate: the idea becomes publicly approved. */
export function statusAfterAdvance(to: OrbitStage, current: 'draft' | 'submitted' | 'needs_work' | 'approved' | 'rejected') {
  if (to === 'lab') return 'approved' as const;
  return current;
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

const SCORE_NAMES = ['problem', 'agentFit', 'prototype', 'security', 'measurable', 'implement'] as const;
const DEMO_SCORE_NAMES = ['function', 'value', 'security', 'readiness'] as const;

/** Demo-day judging: function, business value, security, pilot readiness. */
export function readDemoScores(formData: FormData): DemoScores | null {
  const scores = {} as DemoScores;
  for (const name of DEMO_SCORE_NAMES) {
    const n = Number(String(formData.get(`demo_${name}`) ?? ''));
    if (!isScore(n)) return null;
    scores[name] = n;
  }
  return scores;
}

/** A manager pitch is a real date plus who heard it. */
export function managerPitchIsReady(at: Date | null, audience: string | null): boolean {
  const who = audience?.trim() ?? '';
  return !!at && !Number.isNaN(at.getTime()) && who.length >= 2 && who.length <= 200;
}

/** Read a 1–5 scorecard from the review form. Missing or out-of-range → null. */
export function readScores(formData: FormData): OrbitScores | null {
  const scores = {} as OrbitScores;
  for (const name of SCORE_NAMES) {
    const n = Number(String(formData.get(`score_${name}`) ?? ''));
    if (!isScore(n)) return null;
    scores[name] = n;
  }
  return scores;
}

const CHARTER_TEXT = ['goal', 'scope', 'users', 'metrics', 'risks'] as const;

export function readCharter(formData: FormData): PilotCharter {
  const text = (key: string) => String(formData.get(key) ?? '').trim();
  const decision = text('pilotDecision');
  return {
    goal: text('pilotGoal'),
    scope: text('pilotScope'),
    users: text('pilotUsers'),
    metrics: text('pilotMetrics'),
    risks: text('pilotRisks'),
    decision: decision === 'continue' || decision === 'stop' ? decision : null,
  };
}

export function charterIsComplete(charter: PilotCharter): boolean {
  return CHARTER_TEXT.every((key) => charter[key].length >= 10);
}

/** A clinic gate is ready when it has a real date and a note the team can use. */
export function clinicIsReady(at: Date | null, note: string | null): boolean {
  return !!at && !Number.isNaN(at.getTime()) && (note?.trim().length ?? 0) >= 10;
}
