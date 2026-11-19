/**
 * AI Orbit stage machine. An idea enters at `signal` when the author submits.
 * An admin moves it exactly one stage forward, and some gates demand evidence:
 * a scorecard to leave screening, a deck link to leave the pitch, a pilot
 * charter to leave demo day, and an explicit "continue" to leave the pilot.
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
  | 'pitch_required'
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
  pitchUrl: string | null;
  charter: PilotCharter | null;
}): OrbitAdvanceError | null {
  if (!input.from) return 'not_started';
  if (input.to !== nextOrbitStage(input.from)) return 'not_next';
  if (input.from === 'screening') {
    const s = input.scores;
    if (!s || !Object.values(s).every(isScore)) return 'scores_required';
  }
  if (input.from === 'pitch' && !input.pitchUrl) return 'pitch_required';
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
