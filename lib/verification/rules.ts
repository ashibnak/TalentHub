import { z } from 'zod';

/**
 * Pure decision rules for AI skill verification — no DB, no network, so they
 * can be unit-tested directly (CODE_CONVENTIONS §7 puts verification logic in
 * the "must be tested" bucket).
 *
 * This module owns the model's OUTPUT CONTRACT (the Zod schema) and every
 * numeric judgement made from it. The prompt text lives next door in
 * lib/ai/prompts/verify-skills.ts; the orchestration in run.ts.
 */

/* ────────────────────────── Model output contract ────────────────── */

export const SkillVerdictSchema = z.object({
  skill_slug: z.string().min(1),
  // Models occasionally emit 0-100 instead of 0-1, or a stray negative. Rescale
  // rather than fail the whole run over one malformed field.
  confidence: z.number().transform((n) => (n > 1 ? n / 100 : n)).pipe(z.number().min(0).max(1)),
  evidence: z.string(),
  verdict: z.enum(['verified', 'insufficient']),
});

export const VerifySkillsOutputSchema = z.object({
  verifications: z.array(SkillVerdictSchema),
  summary: z.string(),
});

export type SkillVerdict = z.infer<typeof SkillVerdictSchema>;
export type VerifySkillsOutput = z.infer<typeof VerifySkillsOutputSchema>;

/* ──────────────────────────── Tunable knobs ──────────────────────── */

/**
 * PROJECT_PLAN §3: confidence ≥ 0.7 verifies, everything below stays claimed.
 *
 * The plan calls for recalibrating this against real data after the first ~10
 * runs, so it is deliberately ONE constant that nothing hardcodes around —
 * changing this line changes the pipeline, the admin UI copy, and the tests.
 */
export const VERIFICATION_CONFIDENCE_THRESHOLD = 0.7;

/**
 * Plan §3: "If the README is missing or empty, lower all confidence by 0.2."
 *
 * The prompt already instructs the model to do this, but models are unreliable
 * at arithmetic they're told to perform on themselves — applying it here makes
 * the penalty deterministic and auditable.
 *
 * ⚠️ That means a compliant model has the penalty applied TWICE (once by
 * itself, once here). Flagged rather than silently resolved: the honest fixes
 * are to drop the rule from the prompt or drop it from the code, and which one
 * depends on what the first ten real runs show. Erring strict is the safer
 * default for a trust feature.
 */
export const README_MISSING_PENALTY = 0.2;

/** PROJECT_PLAN §3 failsafe: after this many failures, stop auto-retrying. */
export const MAX_FAILED_RUNS = 3;

/* ────────────────────────────── Predicates ───────────────────────── */

/** The single thresholding decision. Everything else defers to this. */
export function shouldVerify(confidence: number): boolean {
  return confidence >= VERIFICATION_CONFIDENCE_THRESHOLD;
}

/**
 * Apply the missing-README penalty to a raw confidence, clamped to [0, 1].
 * `hasReadme` false means the repo had no README, or it was empty.
 */
export function readmePenalty(confidence: number, hasReadme: boolean): number {
  if (hasReadme) return confidence;
  return Math.max(0, confidence - README_MISSING_PENALTY);
}

/** The failsafe gate: auto-retrying stops once a project has failed this often. */
export function shouldRetry(failedRunCount: number): boolean {
  return failedRunCount < MAX_FAILED_RUNS;
}

/* ──────────────────────── Promotion selection ────────────────────── */

export type ClaimedSkill = {
  skillId: string;
  slug: string;
  verified: boolean;
  verificationSource: 'ai_repo_analysis' | 'manual' | null;
};

export type SkillPromotion = {
  skillId: string;
  slug: string;
  /** Post-penalty confidence — what was actually thresholded. */
  confidence: number;
  evidence: string;
};

/**
 * Decide which of the user's claimed skills this run promotes to verified.
 *
 * Four invariants, in order of importance:
 *  1. A skill a human admin verified manually is NEVER touched — the model may
 *     not overwrite, re-source, or re-date a human decision.
 *  2. Verification only ever moves claimed → verified. A low-confidence verdict
 *     leaves the row exactly as it was; it never downgrades anything.
 *  3. Only skills the user actually claims can be promoted — a slug the model
 *     invented or mismatched is dropped.
 *  4. The README penalty is applied BEFORE thresholding, never after.
 */
export function selectSkillsToVerify(
  verdicts: SkillVerdict[],
  claimed: ClaimedSkill[],
  opts: { hasReadme: boolean } = { hasReadme: true },
): SkillPromotion[] {
  const bySlug = new Map(claimed.map((c) => [c.slug, c]));
  const promotions = new Map<string, SkillPromotion>();

  for (const verdict of verdicts) {
    const skill = bySlug.get(verdict.skill_slug);
    if (!skill) continue; // invariant 3 — not claimed by this user
    if (skill.verificationSource === 'manual') continue; // invariant 1 — human wins

    const confidence = readmePenalty(verdict.confidence, opts.hasReadme); // invariant 4
    if (!shouldVerify(confidence)) continue; // invariant 2

    // A duplicated slug in the model's output keeps the strongest verdict.
    const existing = promotions.get(skill.skillId);
    if (existing && existing.confidence >= confidence) continue;

    promotions.set(skill.skillId, {
      skillId: skill.skillId,
      slug: skill.slug,
      confidence,
      evidence: verdict.evidence,
    });
  }

  return [...promotions.values()];
}
