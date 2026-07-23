import type { Metadata } from 'next';
import { desc } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { createUserAction } from '@/lib/auth/actions';

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
};

function roleLabel(u: { isAdmin: boolean }) {
  return u.isAdmin ? 'Admin' : 'Talent';
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string }>;
}) {
  const sp = await searchParams;
  const rows = await getDb()
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      username: users.username,
      isAdmin: users.isAdmin,
      status: users.status,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-h1 mb-6">کاربران</h1>

      <section className="mb-8 rounded-xl border border-border-subtle bg-surface p-6 shadow-sm">
        <h2 className="text-h3 mb-4">ایجاد کاربر جدید</h2>
        {sp.created && <p className="mb-3 text-body-sm text-success">کاربر با موفقیت ایجاد شد.</p>}
        {sp.error && <p className="mb-3 text-body-sm text-red-400">{ERROR_MESSAGES[sp.error] ?? 'خطا در ایجاد کاربر.'}</p>}
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
          <span>نام</span>
          <span>نقش</span>
          <span>وضعیت</span>
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
