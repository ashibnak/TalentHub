/**
 * Skill-verification prompt — the text is PROJECT_PLAN §3 ("Prompt اصلی برای
 * Skill Verification") verbatim, with the {placeholders} filled from typed
 * params. Kept in English on purpose: the plan notes LLMs produce cleaner JSON
 * in English, and none of this string is ever shown to a user.
 *
 * If you change the wording here, change it in PROJECT_PLAN §3 too — the plan
 * is the source of truth and a silent drift makes the recorded benchmark
 * (3/3 valid JSON, ~4.9s) meaningless.
 *
 * The Zod schema for what this prompt asks the model to RETURN lives in
 * lib/verification/rules.ts, next to the thresholding that consumes it.
 */

export const VERIFY_SKILLS_ACTION = 'verify-skills';

export type VerifySkillsParams = {
  repoName: string;
  repoDescription: string | null;
  /** Top 5 by bytes, most-used first. */
  languages: string[];
  stars: number;
  /** Already truncated to 3000 chars by the GitHub client. */
  readme: string | null;
  /** Top 20 paths. */
  files: string[];
  /** Last 10 commit subjects. */
  commitMessages: string[];
  claimedSkills: { slug: string; name: string }[];
};

const EMPTY = '(none)';

function list(values: string[]): string {
  return values.length ? values.join(', ') : EMPTY;
}

function lines(values: string[]): string {
  return values.length ? values.map((v) => `- ${v}`).join('\n') : EMPTY;
}

/** Render the verification prompt for one repo + the skills claimed on it. */
export function buildVerifySkillsPrompt(params: VerifySkillsParams): string {
  const claimed = params.claimedSkills.length
    ? params.claimedSkills.map((s) => `- ${s.name} (slug: ${s.slug})`).join('\n')
    : EMPTY;

  return `You are a skill verification system for an AI talent platform.

You will receive a GitHub repository's metadata and a list of skills the developer claims they used in this project. Your job: analyze whether the evidence in the repository supports each claim.

Repository metadata:
- Name: ${params.repoName}
- Description: ${params.repoDescription?.trim() || EMPTY}
- Primary languages: ${list(params.languages)}
- Star count: ${params.stars}
- README (first 3000 chars):
${params.readme?.trim() || EMPTY}
- File structure (top 20 files):
${lines(params.files)}
- Recent commit messages (last 10):
${lines(params.commitMessages)}

Developer's claimed skills for this project:
${claimed}

For each claimed skill, return a verdict. Be STRICT — only verify if there is direct, visible evidence in the README, file structure, languages, or commits. Do NOT verify based on assumption or inference from project type alone.

Output STRICT JSON with this exact shape:
{
  "verifications": [
    {
      "skill_slug": "string (must match input slug exactly)",
      "confidence": 0.0,
      "evidence": "1-2 sentence explanation citing specific files/text from the repo",
      "verdict": "verified" | "insufficient"
    }
  ],
  "summary": "1 sentence overall assessment of project quality and skill alignment"
}

Rules:
- confidence >= 0.7 → verdict: "verified"
- confidence < 0.7 → verdict: "insufficient"
- If a claimed skill has zero evidence, set confidence to 0.0 and explain
- If the README is missing or empty, lower all confidence by 0.2
- Do NOT add skills the developer didn't claim
- Output ONLY valid JSON, no markdown fences, no preamble`;
}
