import { z } from 'zod';
import { firstErrorCode } from '@/lib/forms';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const USERNAME_RE = /^[a-z0-9-]{3,32}$/;

/** Admin "create user" form. email/username are lowercased before validation
 *  (as the action always did). DB-level checks (org missing, email/username
 *  already taken) stay in the action — this covers only shape/format. */
export const CreateUserSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().regex(EMAIL_RE),
  username: z.string().regex(USERNAME_RE),
  role: z.enum(['talent', 'admin']),
  password: z.string().min(8),
  roleTitle: z.string().trim().nullable(),
});
export type CreateUserFields = z.infer<typeof CreateUserSchema>;

const CREATE_USER_FIELD_CODES = [
  ['name', 'name'],
  ['email', 'email'],
  ['username', 'username'],
  ['role', 'role'],
  ['password', 'password'],
] as const;

export function parseCreateUserForm(formData: FormData): { error: string } | CreateUserFields {
  const parsed = CreateUserSchema.safeParse({
    name: String(formData.get('name') ?? '').trim(),
    email: String(formData.get('email') ?? '').trim().toLowerCase(),
    username: String(formData.get('username') ?? '').trim().toLowerCase(),
    role: String(formData.get('role') ?? 'talent'),
    password: String(formData.get('password') ?? ''),
    roleTitle: String(formData.get('roleTitle') ?? '').trim() || null,
  });
  if (!parsed.success) return { error: firstErrorCode(parsed.error, CREATE_USER_FIELD_CODES) };
  return parsed.data;
}
