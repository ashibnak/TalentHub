/**
 * Computes a user's `role_badge` — a COMPUTED identity marker, not stored
 * (plan §2 users note, Week 3 Prompt 7). It is identity, not ranking.
 *
 *   - 'domain_expert' — has domain expertise but few/no technical skills
 *   - 'builder'       — has technical skills but no domain expertise
 *   - 'hybrid'        — has both
 *
 * "Technical skills" excludes the `ai_tool` category: a Domain Expert who uses
 * ChatGPT/Cursor is still a Domain Expert, not a Builder. Threshold for
 * "enough technical skills to read as a builder" is 3 (plan: "< 3 technical").
 */
export type RoleBadge = 'builder' | 'domain_expert' | 'hybrid';

export const BUILDER_SKILL_THRESHOLD = 3;

export function computeRoleBadge(input: {
  technicalSkillCount: number;
  domainCount: number;
}): RoleBadge {
  const hasDomains = input.domainCount > 0;
  const isBuilderLevel = input.technicalSkillCount >= BUILDER_SKILL_THRESHOLD;

  if (hasDomains && isBuilderLevel) return 'hybrid';
  if (hasDomains) return 'domain_expert'; // domains + 0-2 technical skills
  return 'builder'; // no domains → builder (default persona even at 0 skills)
}

/** English display label (stays English per design system §7.5). */
export const ROLE_BADGE_LABEL: Record<RoleBadge, string> = {
  builder: 'Builder',
  domain_expert: 'Domain Expert',
  hybrid: 'Hybrid',
};
