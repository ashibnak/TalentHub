import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { desc } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { createUserAction } from '@/lib/auth/actions';
import { requireAdmin } from '@/lib/auth/session';
import { createInviteAction, revokeInviteAction } from '@/lib/actions/invitations';
import { getMainOrgId } from '@/lib/db/queries/org';
import { listInvitations, type InvitationRow } from '@/lib/db/queries/invitations';
import { PERSONA_LABEL_FA } from '@/lib/invitations/rules';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'کاربران — مدیریت' };

const inputClass =
  'bg-canvas border border-border focus:border-border-focus focus:bg-info-subtle rounded-md px-3 py-2 text-body text-fg placeholder:text-text-muted outline-none transition-colors';

const ERROR_MESSAGES: Record<string, string> = {
  name: 'نام نامعتبر است.',
  email: 'ایمیل نامعتبر است.',
  username: 'نام کاربری باید ۳ تا ۳۲ کاراکتر (a-z، ۰-۹، -) باشد.',
  role: 'نقش نامعتبر است.',
  password: 'رمز عبور باید حداقل ۸ کاراکتر باشد.',
  exists: 'ایمیل یا نام کاربری قبلاً استفاده شده است.',
  org: 'سازمان یافت نشد.',
  invite_email: 'ایمیل دعوت نامعتبر است.',
  invite_persona: 'پرسونای دعوت نامعتبر است.',
  invite_user_exists: 'برای این ایمیل قبلاً حساب ساخته شده — دعوت لازم نیست.',
  invite_org: 'سازمان یافت نشد — اول seed را اجرا کن.',
};

const INVITE_STATUS_FA: Record<InvitationRow['status'], string> = {
  pending: 'در انتظار',
  accepted: 'استفاده‌شده',
  expired: 'منقضی',
};

function roleLabel(u: { isAdmin: boolean }) {
  return u.isAdmin ? 'Admin' : 'Talent';
}

// Jalali short date for invite expiry.
const DATE_FA = new Intl.DateTimeFormat('fa-IR', { month: 'short', day: 'numeric', timeZone: 'Asia/Tehran' });

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string; invite_token?: string; invite_email?: string; revoked?: string }>;
}) {
  // Defense in depth: the layout gates too, but layouts are not a reliable sole
  // auth boundary in the App Router (soft-nav can skip re-rendering them).
  await requireAdmin();
  const sp = await searchParams;
  const [rows, orgId, headerStore] = await Promise.all([
    getDb()
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        username: users.username,
        isAdmin: users.isAdmin,
        status: users.status,
      })
      .from(users)
      .orderBy(desc(users.createdAt)),
    getMainOrgId(),
    headers(),
  ]);
  const invites = orgId ? await listInvitations(orgId) : [];

  // Absolute invite link from the request itself (works on prod + local alike).
  const proto = headerStore.get('x-forwarded-proto') ?? 'https';
  const host = headerStore.get('host') ?? 'localhost:3000';
  const inviteLink = sp.invite_token ? `${proto}://${host}/invite/${sp.invite_token}` : null;

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-h1 mb-6">کاربران</h1>

      {/* ── Invites (plan Week 2 — link-based, no SMTP in phase 1) ── */}
      <section className="mb-8 rounded-xl border border-border-subtle bg-surface p-6 shadow-sm">
        <h2 className="text-h3 mb-1">دعوت با لینک</h2>
        <p className="mb-4 text-body-sm text-text-tertiary">
          لینک یک‌بارمصرف با اعتبار ۷ روز ساخته می‌شود — خودت آن را برای فرد بفرست (ایمیل خودکار در فاز ۱ نداریم).
        </p>
        {sp.error?.startsWith('invite_') && (
          <p className="mb-3 text-body-sm text-state-error">{ERROR_MESSAGES[sp.error] ?? 'خطا در ساخت دعوت.'}</p>
        )}
        {sp.revoked && <p className="mb-3 text-body-sm text-success">دعوت لغو شد.</p>}
        {inviteLink && (
          <div className="mb-4 rounded-lg border border-success-muted bg-success-subtle p-4">
            <p className="mb-2 text-body-sm text-success">
              دعوت برای <span dir="ltr">{sp.invite_email}</span> ساخته شد — این لینک فقط همین‌جا نمایش داده می‌شود:
            </p>
            <p dir="ltr" className="break-all rounded-md bg-canvas px-3 py-2 text-body-sm text-fg select-all">
              {inviteLink}
            </p>
          </div>
        )}
        <form action={createInviteAction} className="flex flex-wrap items-end gap-3">
          <label className="block grow text-body-sm text-text-tertiary">
            ایمیل
            <input name="email" type="email" dir="ltr" required className={`mt-1 w-full ${inputClass}`} placeholder="someone@company.com" />
          </label>
          <label className="block text-body-sm text-text-tertiary">
            پرسونا (شخصی‌سازی دعوت)
            <select name="personaHint" defaultValue="unknown" className={`mt-1 ${inputClass}`}>
              {Object.entries(PERSONA_LABEL_FA).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-md bg-action px-4 py-2 text-body font-medium text-on-action shadow-sm transition-colors hover:bg-action-hover"
          >
            ساخت لینک دعوت
          </button>
        </form>

        {invites.length > 0 && (
          <div className="mt-6 overflow-hidden rounded-lg border border-border-subtle">
            <div className="grid grid-cols-[2fr_1fr_1fr_auto] items-center gap-3 border-b border-border-subtle px-4 py-2 text-body-sm text-text-tertiary">
              <span>Email</span>
              <span>Persona</span>
              <span>Status</span>
              <span aria-hidden />
            </div>
            {invites.map((inv) => (
              <div key={inv.id} className="grid grid-cols-[2fr_1fr_1fr_auto] items-center gap-3 border-t border-border-subtle px-4 py-3 text-body-sm">
                <span dir="ltr" className="truncate text-start text-fg">
                  {inv.email}
                </span>
                <span className="truncate text-text-tertiary">{PERSONA_LABEL_FA[inv.personaHint]}</span>
                <span className="text-text-tertiary">
                  {INVITE_STATUS_FA[inv.status]}
                  {inv.status === 'pending' && ` · تا ${DATE_FA.format(inv.expiresAt)}`}
                </span>
                {inv.status === 'pending' ? (
                  <form action={revokeInviteAction}>
                    <input type="hidden" name="invitationId" value={inv.id} />
                    <button type="submit" className="text-body-sm text-text-muted transition-colors hover:text-state-error">
                      لغو
                    </button>
                  </form>
                ) : (
                  <span aria-hidden />
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mb-8 rounded-xl border border-border-subtle bg-surface p-6 shadow-sm">
        <h2 className="text-h3 mb-4">ایجاد کاربر جدید (مستقیم)</h2>
        {sp.created && <p className="mb-3 text-body-sm text-success">کاربر با موفقیت ایجاد شد.</p>}
        {sp.error && !sp.error.startsWith('invite_') && (
          <p className="mb-3 text-body-sm text-state-error">{ERROR_MESSAGES[sp.error] ?? 'خطا در ایجاد کاربر.'}</p>
        )}
        <form action={createUserAction} className="grid gap-3 sm:grid-cols-2">
          <input name="name" placeholder="نام" required className={inputClass} />
          <input name="email" type="email" placeholder="ایمیل" required className={inputClass} />
          <input name="username" dir="ltr" placeholder="نام کاربری (a-z، ۰-۹، -)" required className={inputClass} />
          <input name="roleTitle" placeholder="عنوان شغلی (اختیاری)" className={inputClass} />
          <select name="role" defaultValue="talent" aria-label="نقش" className={inputClass}>
            <option value="talent">Talent · استعداد</option>
            <option value="admin">Admin · مدیر</option>
          </select>
          <input name="password" type="text" placeholder="رمز عبور موقت (حداقل ۸ کاراکتر)" required minLength={8} className={inputClass} />
          <button
            type="submit"
            className="sm:col-span-2 rounded-md bg-action px-4 py-2 text-body font-medium text-on-action shadow-sm transition-colors hover:bg-action-hover"
          >
            ایجاد کاربر
          </button>
        </form>
      </section>

      <section className="overflow-hidden rounded-xl border border-border-subtle bg-surface shadow-sm">
        <div className="grid grid-cols-[2fr_1fr_1fr] gap-3 border-b border-border-subtle px-4 py-2 text-body-sm text-text-muted">
          <span>Name</span>
          <span>Role</span>
          <span>Status</span>
        </div>
        {rows.map((u) => (
          <div key={u.id} className="grid grid-cols-[2fr_1fr_1fr] items-center gap-3 border-t border-border-subtle px-4 py-3 text-body-sm">
            <div className="min-w-0">
              <div className="truncate text-fg">{u.name}</div>
              <div className="truncate text-text-tertiary">{u.email}</div>
            </div>
            <span className="text-text-tertiary">{roleLabel(u)}</span>
            <span className="text-text-tertiary">{u.status}</span>
          </div>
        ))}
      </section>
    </main>
  );
}
