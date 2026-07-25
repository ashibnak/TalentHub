import { z } from 'zod';
import { firstErrorCode } from '@/lib/forms';

const GITHUB_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;

export type OnboardingChoice = 'builder' | 'domain_expert' | 'hybrid';
export type OnboardingConfidence = 'high' | 'medium' | 'low' | 'unknown';

/** Where the wizard's step-4 "first action" cards can send the user. */
export type Destination = 'new_project' | 'challenges' | 'people' | 'home';
export const DESTINATION_PATHS: Record<Destination, string> = {
  new_project: '/projects/new',
  challenges: '/challenges',
  people: '/people',
  home: '/home',
};

/** One selected domain with optional years of experience (0–50). */
export const DomainPickSchema = z.object({
  slug: z.string().min(1),
  years: z.number().int().min(0, { message: 'years' }).max(50, { message: 'years' }).nullable(),
});
export type DomainPick = z.infer<typeof DomainPickSchema>;

/**
 * Final wizard submit (plan Week 2 Prompt 5). Branch requirements:
 * builder → github optional, no domains; domain_expert → ≥1 domain;
 * hybrid → both sets allowed. Codes, not messages (Persian lives in the UI).
 */
export const OnboardingSchema = z
  .object({
    choice: z.enum(['builder', 'domain_expert', 'hybrid']),
    roleTitle: z.string().trim().max(120, { message: 'role_title' }).nullable(),
    bio: z.string().trim().max(600, { message: 'bio' }).nullable(),
    githubUsername: z.string().regex(GITHUB_RE, { message: 'github' }).nullable(),
    domains: z.array(DomainPickSchema).max(11, { message: 'domains' }),
    skillSlugs: z.array(z.string().min(1)).max(40, { message: 'skills' }),
    confidence: z.enum(['high', 'medium', 'low', 'unknown']),
    destination: z.enum(['new_project', 'challenges', 'people', 'home']),
  })
  .refine((v) => v.choice === 'builder' || v.domains.length > 0, {
    path: ['domains'],
    message: 'domains_required',
  });
export type OnboardingFields = z.infer<typeof OnboardingSchema>;

const FIELD_CODES = [
  ['choice', 'choice'],
  ['roleTitle', 'role_title'],
  ['bio', 'bio'],
  ['githubUsername', 'github'],
  ['domains', 'domains_required'],
  ['skillSlugs', 'skills'],
  ['confidence', 'confidence'],
  ['destination', 'destination'],
] as const;

/**
 * FormData layout from the wizard: `domains` repeated slug entries, with a
 * matching optional `years_<slug>` number per selected domain; `skills`
 * repeated slug entries (hybrid only).
 */
export function parseOnboardingForm(formData: FormData): { error: string } | OnboardingFields {
  const domainSlugs = [...new Set(formData.getAll('domains').map((d) => String(d)).filter(Boolean))];
  const domains = domainSlugs.map((slug) => {
    const raw = String(formData.get(`years_${slug}`) ?? '').trim();
    const n = raw === '' ? null : Number(raw);
    // Clamp to the input's own 0-50 affordance (a mis-typed value must never
    // surface as an unrelated «domains_required» error two steps later).
    const years = n === null || Number.isNaN(n) ? null : Math.min(50, Math.max(0, Math.trunc(n)));
    return { slug, years };
  });

  const parsed = OnboardingSchema.safeParse({
    choice: String(formData.get('choice') ?? ''),
    roleTitle: String(formData.get('roleTitle') ?? '').trim() || null,
    bio: String(formData.get('bio') ?? '').trim() || null,
    githubUsername: String(formData.get('githubUsername') ?? '').trim().replace(/^@/, '') || null,
    domains,
    skillSlugs: [...new Set(formData.getAll('skills').map((s) => String(s)).filter(Boolean))],
    confidence: String(formData.get('confidence') ?? 'unknown'),
    destination: String(formData.get('destination') ?? 'home'),
  });
  if (!parsed.success) return { error: firstErrorCode(parsed.error, FIELD_CODES) };
  return parsed.data;
}
