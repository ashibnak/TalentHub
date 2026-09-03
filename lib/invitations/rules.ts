import { z } from 'zod';
import { firstErrorCode } from '@/lib/forms';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const USERNAME_RE = /^[a-z0-9-]{3,32}$/;

/** Invite links are valid for 7 days (plan Week 2 human-review note). */
export const INVITE_TTL_DAYS = 7;
export const INVITE_TTL_MS = INVITE_TTL_DAYS * 24 * 60 * 60 * 1000;

export type PersonaHint = 'builder' | 'domain_expert' | 'hybrid' | 'unknown';

export const PERSONA_LABEL_FA: Record<PersonaHint, string> = {
  builder: 'سازنده · Builder',
  domain_expert: 'متخصص حوزه · Domain Expert',
  hybrid: 'ترکیبی · Hybrid',
  unknown: 'نامشخص',
};

/** Admin "create invite" form. Shape only — duplicate email/invite checks stay
 *  in the action (they need the DB). */
export const CreateInviteSchema = z.object({
  email: z.string().regex(EMAIL_RE, { message: 'email' }),
  personaHint: z.enum(['builder', 'domain_expert', 'hybrid', 'unknown']),
});
export type CreateInviteFields = z.infer<typeof CreateInviteSchema>;

const CREATE_INVITE_FIELD_CODES = [
  ['email', 'email'],
  ['personaHint', 'persona'],
] as const;

export function parseCreateInviteForm(formData: FormData): { error: string } | CreateInviteFields {
  const parsed = CreateInviteSchema.safeParse({
    email: String(formData.get('email') ?? '').trim().toLowerCase(),
    personaHint: String(formData.get('personaHint') ?? 'unknown'),
  });
  if (!parsed.success) return { error: firstErrorCode(parsed.error, CREATE_INVITE_FIELD_CODES) };
  return parsed.data;
}

/** The invited person's account-setup form (/invite/[token]).
 *  Messages are CODES; Persian text lives in the client component. */
export const AcceptInviteSchema = z
  .object({
    name: z.string().trim().min(2, { message: 'name' }).max(80, { message: 'name' }),
    username: z.string().regex(USERNAME_RE, { message: 'username' }),
    password: z.string().min(8, { message: 'password' }),
    passwordConfirm: z.string(),
  })
  .refine((v) => v.password === v.passwordConfirm, {
    path: ['passwordConfirm'],
    message: 'password_mismatch',
  });
export type AcceptInviteFields = z.infer<typeof AcceptInviteSchema>;

const ACCEPT_FIELD_CODES = [
  ['name', 'name'],
  ['username', 'username'],
  ['password', 'password'],
  ['passwordConfirm', 'password_mismatch'],
] as const;

export function parseAcceptInviteForm(formData: FormData): { error: string } | AcceptInviteFields {
  const parsed = AcceptInviteSchema.safeParse({
    name: String(formData.get('name') ?? '').trim(),
    username: String(formData.get('username') ?? '').trim().toLowerCase(),
    password: String(formData.get('password') ?? ''),
    passwordConfirm: String(formData.get('passwordConfirm') ?? ''),
  });
  if (!parsed.success) return { error: firstErrorCode(parsed.error, ACCEPT_FIELD_CODES) };
  return parsed.data;
}

export type InviteRejection = 'not_found' | 'used' | 'expired';

export type InviteGuardInput = {
  invitation: { status: 'pending' | 'accepted' | 'expired'; expiresAt: Date } | null;
  now?: Date;
};

/** Whether an invite token can still be redeemed, independent of the DB/HTTP
 *  layer so it can be unit-tested. Returns a rejection code, or null when usable. */
export function checkInviteUsable(input: InviteGuardInput): InviteRejection | null {
  const { invitation, now = new Date() } = input;
  if (!invitation) return 'not_found';
  if (invitation.status === 'accepted') return 'used';
  if (invitation.status === 'expired') return 'expired';
  if (invitation.expiresAt.getTime() < now.getTime()) return 'expired';
  return null;
}
