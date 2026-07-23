import type { Metadata } from 'next';
import Link from 'next/link';
import { Users, LayoutDashboard, Trophy } from 'lucide-react';
import { freezeLastWeekAction } from '@/lib/actions/leaderboard';
import { toFaDigits } from '@/lib/format';
import { btnPrimary } from '@/lib/ui';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'مدیریت — AIGraph' };

const cards = [
  { href: '/admin/users', title: 'کاربران', desc: 'ایجاد و مدیریت کاربران بر اساس نقش', icon: Users },
  { href: '/dashboard', title: 'داشبورد سازمان', desc: 'متریک‌های کل سازمان', icon: LayoutDashboard },
];

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ frozen?: string; error?: string }> }) {
  const sp = await searchParams;

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-h1 mb-2">مدیریت</h1>
      <p className="text-body-sm text-text-tertiary mb-8">پنل مدیریت AIGraph</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="rounded-xl border border-border-subtle bg-surface p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-info-subtle">
              <c.icon size={20} strokeWidth={1.5} className="text-info" />
            </div>
            <h2 className="text-h3 text-fg mb-1">{c.title}</h2>
            <p className="text-body-sm text-text-tertiary">{c.desc}</p>
          </Link>
        ))}
      </div>

      {/* ── Weekly leaderboard: close the just-ended week ── */}
      <section className="mt-8 rounded-xl border border-border-subtle bg-surface p-6 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Trophy size={20} strokeWidth={1.5} className="text-info" />
          <h2 className="text-h3 text-fg">رتبه‌بندی هفتگی</h2>
        </div>
        <p className="mb-4 text-body-sm text-text-tertiary">
          نتایج هفته‌ی گذشته را نهایی کن و نشان «Top of the Week» را به نفر اول هر گروه بده. هر شنبه یک‌بار بزن.
        </p>
        {sp.frozen !== undefined && (
          <p className="mb-3 text-body-sm text-success">
            هفته‌ی گذشته ثبت شد — {toFaDigits(sp.frozen)} نفر رتبه‌بندی شدند.
          </p>
        )}
        {sp.error === 'freeze_failed' && (
          <p className="mb-3 text-body-sm text-red-400">ثبت هفته با خطا مواجه شد. دوباره تلاش کن.</p>
        )}
        <form action={freezeLastWeekAction}>
          <button type="submit" className={btnPrimary}>
            بستن و ثبت هفته‌ی گذشته
          </button>
        </form>
      </section>
    </main>
  );
}
