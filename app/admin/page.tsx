import type { Metadata } from 'next';
import Link from 'next/link';
import { Users, LayoutDashboard, Trophy, ShieldCheck, Sparkles } from 'lucide-react';
import { freezeLastWeekAction } from '@/lib/actions/leaderboard';
import { getExpiredSpotlightsAwaitingWinner } from '@/lib/db/queries/spotlight';
import { SpotlightWinnerPicker } from '@/components/molecules/SpotlightWinnerPicker';
import { toFaDigits } from '@/lib/format';
import { btnPrimary } from '@/lib/ui';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'مدیریت — AIGraph' };

const cards = [
  { href: '/admin/users', title: 'کاربران', desc: 'ایجاد و مدیریت کاربران بر اساس نقش', icon: Users },
  {
    href: '/admin/verifications',
    title: 'تأیید مهارت‌ها',
    desc: 'اجراهای AI روی repo ها، شواهد هر مهارت و اجرای دوباره',
    icon: ShieldCheck,
  },
  { href: '/dashboard', title: 'داشبورد سازمان', desc: 'متریک‌های کل سازمان', icon: LayoutDashboard },
];

const SPOTLIGHT_ERRORS: Record<string, string> = {
  problem_not_active: 'فقط مسئله‌های active را می‌توان Spotlight کرد.',
  spotlight_taken: 'یک Spotlight دیگر در جریان است.',
  already_spotlight: 'این مسئله همین حالا Spotlight است.',
  problem_not_found: 'مسئله پیدا نشد.',
  not_spotlighted: 'این مسئله هیچ‌وقت Spotlight نشده.',
  window_open: 'تا پایان هفته‌ی Spotlight نمی‌توان برنده انتخاب کرد.',
  project_not_linked: 'این پروژه روی این مسئله ثبت نشده است.',
  winner_already_picked: 'برنده‌ی این Spotlight قبلاً ثبت شده.',
  invalid: 'ورودی نامعتبر است.',
  internal: 'مشکلی پیش آمد. دوباره تلاش کن.',
};

export default async function AdminHome({
  searchParams,
}: {
  searchParams: Promise<{ frozen?: string; error?: string; spotlight?: string; spotlightError?: string }>;
}) {
  const sp = await searchParams;
  const awaitingWinner = await getExpiredSpotlightsAwaitingWinner();

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
          <p className="mb-3 text-body-sm text-state-error">ثبت هفته با خطا مواجه شد. دوباره تلاش کن.</p>
        )}
        <form action={freezeLastWeekAction}>
          <button type="submit" className={btnPrimary}>
            بستن و ثبت هفته‌ی گذشته
          </button>
        </form>
      </section>

      {/* ── Spotlight: pick winners for windows that have closed ──
          Sits next to the freeze control because both are the same Saturday
          ritual: close the week, then crown the Spotlight winner. */}
      <section className="mt-8 rounded-xl border border-border-subtle bg-surface p-6 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles size={20} strokeWidth={1.5} className="text-highlight" />
          <h2 className="text-h3 text-fg">Spotlight — انتخاب برنده</h2>
        </div>
        <p className="mb-4 text-body-sm text-text-tertiary">
          هفته‌های Spotlight که تمام شده‌اند و هنوز برنده‌ای ندارند. برنده نشان «Spotlight Solver» و{' '}
          {toFaDigits(50)} امتیاز هفتگی می‌گیرد.
        </p>

        {sp.spotlight === 'started' && <p className="mb-3 text-body-sm text-success">Spotlight شروع شد.</p>}
        {sp.spotlight === 'ended' && <p className="mb-3 text-body-sm text-success">Spotlight بسته شد.</p>}
        {sp.spotlight === 'winner' && (
          <p className="mb-3 text-body-sm text-success">برنده ثبت شد و نشان Spotlight Solver داده شد.</p>
        )}
        {sp.spotlightError && (
          <p className="mb-3 text-body-sm text-state-error">
            {SPOTLIGHT_ERRORS[sp.spotlightError] ?? SPOTLIGHT_ERRORS.internal}
          </p>
        )}

        {awaitingWinner.length > 0 ? (
          <div className="flex flex-col gap-3">
            {awaitingWinner.map((s) => (
              <SpotlightWinnerPicker key={s.problemId} spotlight={s} />
            ))}
          </div>
        ) : (
          <p className="text-body-sm text-text-muted">
            هیچ Spotlightـی در انتظار برنده نیست. برای شروع یک هفته‌ی جدید، از صفحه‌ی یک مسئله «Spotlight این مسئله» را
            بزن.
          </p>
        )}
      </section>
    </main>
  );
}
