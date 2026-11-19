/** Mentor types named on the Orbit landing. A person is assigned to one idea. */
export const MENTOR_ROLES = ['product', 'ai_architecture', 'engineering', 'data', 'security', 'pilot'] as const;
export type MentorRole = (typeof MENTOR_ROLES)[number];

export const MENTOR_ROLE_LABEL: Record<MentorRole, string> = {
  product: 'منتور محصول',
  ai_architecture: 'منتور معماری',
  engineering: 'منتور مهندسی',
  data: 'منتور داده',
  security: 'منتور امنیت',
  pilot: 'منتور پایلوت',
};

export function mentorRole(value: string): MentorRole | null {
  return MENTOR_ROLES.find((role) => role === value) ?? null;
}
