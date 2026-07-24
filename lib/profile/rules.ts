import { z } from 'zod';
import { isHttpUrl } from '@/lib/validation';
import { firstErrorCode } from '@/lib/forms';

const GITHUB_USERNAME_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38})$/;

/** Editable core profile fields. Optional fields are nullable — an empty input
 *  is null (skips validation), matching the old `value || null` guards. */
export const ProfileFormSchema = z.object({
  name: z.string().trim().min(2).max(80),
  roleTitle: z.string().trim().max(120).nullable(),
  bio: z.string().trim().max(600).nullable(),
  githubUsername: z.string().regex(GITHUB_USERNAME_RE).nullable(),
  linkedinUrl: z.string().refine(isHttpUrl).nullable(),
});
export type ProfileFormFields = z.infer<typeof ProfileFormSchema>;

const PROFILE_FIELD_CODES = [
  ['name', 'name'],
  ['roleTitle', 'roleTitle'],
  ['bio', 'bio'],
  ['githubUsername', 'github'],
  ['linkedinUrl', 'linkedin'],
] as const;

export function parseProfileForm(formData: FormData): { error: string } | ProfileFormFields {
  const parsed = ProfileFormSchema.safeParse({
    name: String(formData.get('name') ?? '').trim(),
    roleTitle: String(formData.get('roleTitle') ?? '').trim() || null,
    bio: String(formData.get('bio') ?? '').trim() || null,
    githubUsername: String(formData.get('githubUsername') ?? '').trim().replace(/^@/, '') || null,
    linkedinUrl: String(formData.get('linkedinUrl') ?? '').trim() || null,
  });
  if (!parsed.success) return { error: firstErrorCode(parsed.error, PROFILE_FIELD_CODES) };
  return parsed.data;
}

/** Claim-a-skill form: slug required, level an integer 1–5. */
export const AddSkillSchema = z.object({
  skillSlug: z.string().trim().min(1),
  claimedLevel: z.number().int().min(1).max(5),
});

const ADD_SKILL_FIELD_CODES = [
  ['skillSlug', 'skill'],
  ['claimedLevel', 'level'],
] as const;

export function parseAddSkillForm(formData: FormData): { error: string } | z.infer<typeof AddSkillSchema> {
  const parsed = AddSkillSchema.safeParse({
    skillSlug: String(formData.get('skillSlug') ?? '').trim(),
    claimedLevel: Number(formData.get('claimedLevel') ?? '1'),
  });
  if (!parsed.success) return { error: firstErrorCode(parsed.error, ADD_SKILL_FIELD_CODES) };
  return parsed.data;
}
