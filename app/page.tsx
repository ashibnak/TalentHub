import Link from 'next/link';
import {
  ShieldCheck,
  Activity,
  Target,
  Users,
  FolderKanban,
  Wrench,
  Check,
  ArrowLeft,
} from 'lucide-react';
import { getPlatformStats } from '@/lib/db/queries/stats';
import { getPeopleDirectory } from '@/lib/db/queries/users';
import { getChallengesDirectory } from '@/lib/db/queries/challenges';
import { ChallengeCard } from '@/components/molecules/ChallengeCard';
import { Avatar } from '@/components/atoms/Avatar';
import { LogoMark } from '@/components/layout/LogoMark';
import { toFaDigits } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [stats, people, challenges] = await Promise.all([
    getPlatformStats(),
    getPeopleDirectory(),
    getChallengesDirectory(),
  ]);

  const statItems = [
    { label: 'عضو', value: stats.members, icon: Users },
    { label: 'پروژه', value: stats.projects, icon: FolderKanban },
    { label: 'چالش', value: stats.challenges, icon: Target },
    { label: 'مهارت تأیید‌شده', value: stats.verifiedSkills, icon: ShieldCheck },
  ];
  const features = [
    { icon: ShieldCheck, title: 'تأیید از روی کد، نه ادعا', desc: 'مهارت‌ها با تحلیل هوشمند مخزن GitHub تأیید می‌شوند. هر تیکِ سبز یعنی شواهد واقعی — نه یک خط رزومه.' },
    { icon: Target, title: 'چالش‌های واقعی سازمان', desc: 'دسته‌های دامنه‌ای از مشکلات واقعی — از منابع انسانی تا مهندسی — که با ابزارهای AI حل می‌شوند.' },
    { icon: Activity, title: 'گرافِ زنده', desc: 'پروفایل‌ها با فعالیت واقعیِ ساختن نفس می‌کشند — پروژه‌ی تازه، مهارت تازه، مشارکت تازه. پورتفولیوی مرده نداریم.' },
    { icon: Users, title: 'هر دو نوع استعداد', desc: 'هم سازنده‌ها، هم متخصص‌های حوزه‌ای که با ابزارهای AI می‌سازند — کنار هم، در یک گراف.' },
  ];
  const steps = [
    { icon: Wrench, title: 'بساز', desc: 'با Cursor، Claude Code و ابزارهای AI پروژه بساز، مهارت‌هایت را ثبت کن و پروفایلت را منتشر کن.' },
    { icon: ShieldCheck, title: 'تأیید شو', desc: 'مهارت‌هایت از روی مخزن GitHub هوشمندانه تأیید می‌شود — شفاف و قابل استناد.' },
    { icon: Target, title: 'دیده شو', desc: 'به چالش‌های واقعی سازمان وصل شو، در گراف استعدادها دیده شو و در رتبه‌بندی مشارکت جایگاهت را ببین.' },
  ];

  return (
    <main>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(50%_50%_at_50%_0%,rgba(76,209,214,0.18),transparent)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(35%_40%_at_88%_12%,rgba(255,171,0,0.10),transparent)]"
        />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 pt-20 pb-16 text-center">
          <div className="mb-8 flex justify-center">
            <LogoMark size={56} />
          </div>
          <h1 className="mx-auto mb-5 max-w-3xl text-display font-bold text-fg">
            جایی که استعدادِ <span className="text-info">هوش مصنوعی</span> سازمان دیده می‌شود
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-body-lg text-text-tertiary">
            این‌جا رزومه معیار نیست — <span className="text-fg">ساختن</span> معیار است.
            همکارها با پروژه‌های واقعی پروفایل می‌سازند، مهارت‌هایشان از روی مخزن GitHub تأیید می‌شود،
            و در چالش‌های واقعی سازمان مشارکت می‌کنند.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/people"
              className="rounded-full bg-action px-6 py-3 text-body-lg font-medium text-on-action transition-colors hover:bg-action-hover"
            >
              کاوش استعدادها
            </Link>
            <Link
              href="/challenges"
              className="rounded-full border border-border bg-surface px-6 py-3 text-body-lg font-medium text-fg transition-colors hover:bg-surface-elevated"
            >
              دیدن چالش‌ها
            </Link>
          </div>
          {people.length > 0 && (
            <div className="mt-10 flex items-center justify-center gap-3">
              <div className="flex">
                {people.slice(0, 6).map((p, i) => (
                  <div key={p.username} className="rounded-full ring-2 ring-canvas" style={{ marginInlineStart: i > 0 ? -10 : 0 }}>
                    <Avatar name={p.name} size={32} />
                  </div>
                ))}
              </div>
              <span className="text-body-sm text-text-muted">{toFaDigits(stats.members)} عضو فعال در شبکه</span>
            </div>
          )}
        </div>
      </section>

      {/* ── Stats strip ── */}
      <section className="border-y border-border-subtle bg-surface">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px bg-border-subtle md:grid-cols-4">
          {statItems.map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-surface px-4 py-8 text-center">
              <Icon size={16} strokeWidth={1.5} className="mx-auto mb-2 text-highlight" />
              <div className="text-h1 font-bold text-fg">{toFaDigits(value)}</div>
              <div className="mt-1 text-body-sm text-text-tertiary">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
        <h2 className="mb-2 text-center text-h2">چرا AIGraph؟</h2>
        <p className="mx-auto mb-12 max-w-xl text-center text-body text-text-tertiary">
          اعتماد از راه تأیید، نه ادعا. کشف از راه گراف، نه رزومه.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <div key={f.title} className="rounded-xl border border-border-subtle bg-surface p-6">
              <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ${i % 2 === 0 ? 'bg-info-subtle' : 'bg-highlight-subtle'}`}>
                <f.icon size={20} strokeWidth={1.5} className={i % 2 === 0 ? 'text-info' : 'text-highlight'} />
              </div>
              <h3 className="mb-1 text-h3">{f.title}</h3>
              <p className="text-body-sm leading-relaxed text-text-tertiary">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
        <h2 className="mb-12 text-center text-h2">چطور کار می‌کند</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.title} className="rounded-xl border border-border-subtle bg-surface p-6">
              <div className="mb-3 flex items-center gap-3">
                <span className="text-h2 font-bold text-highlight">{toFaDigits(i + 1)}</span>
                <s.icon size={20} strokeWidth={1.5} className="text-fg" />
              </div>
              <h3 className="mb-1 text-h3">{s.title}</h3>
              <p className="text-body-sm leading-relaxed text-text-tertiary">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Two personas ── */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border-subtle bg-surface p-8">
            <h2 className="mb-2 text-h2">برای سازنده‌ها</h2>
            <p className="mb-6 text-body text-text-tertiary">پروفایلی که مهارت‌های واقعی‌ات را ثابت می‌کند.</p>
            <ul className="mb-6 flex flex-col gap-3">
              {['پروفایل و پروژه‌های خودت را بساز', 'مهارت‌ها از روی GitHub تأیید می‌شوند', 'به چالش‌های واقعی سازمان وصل شو', 'در رتبه‌بندی مشارکت هفتگی دیده شو'].map((t) => (
                <li key={t} className="flex items-center gap-2 text-body text-fg">
                  <Check size={16} strokeWidth={2} className="text-success shrink-0" />
                  {t}
                </li>
              ))}
            </ul>
            <Link href="/people" className="inline-flex items-center gap-1 text-body font-medium text-info transition-colors hover:text-fg">
              کاوش استعدادها
              <ArrowLeft size={16} strokeWidth={1.5} />
            </Link>
          </div>
          <div className="rounded-2xl bg-fg p-8 text-on-action">
            <h2 className="mb-2 text-h2 text-on-action">برای متخصص‌های حوزه‌ای</h2>
            <p className="mb-6 text-body text-on-action/70">نیازی به کدنویسی نیست — تخصصت را با ابزارهای AI نشان بده.</p>
            <ul className="mb-6 flex flex-col gap-3">
              {['تخصص دامنه‌ای‌ات را ثبت کن', 'در چالش‌های حوزه‌ی خودت مشارکت کن', 'در صفحه‌ی هر چالش دیده شو', 'کنار سازنده‌ها، در یک گراف'].map((t) => (
                <li key={t} className="flex items-center gap-2 text-body text-on-action">
                  <Check size={16} strokeWidth={2} className="text-info-inverted shrink-0" />
                  {t}
                </li>
              ))}
            </ul>
            <Link href="/challenges" className="inline-flex items-center gap-1 text-body font-medium text-on-action transition-colors hover:text-on-action/80">
              دیدن چالش‌ها
              <ArrowLeft size={16} strokeWidth={1.5} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Featured challenges ── */}
      {challenges.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-h2">چالش‌های فعال</h2>
            <Link href="/challenges" className="inline-flex items-center gap-1 text-body-sm text-info transition-colors hover:text-fg">
              همه
              <ArrowLeft size={16} strokeWidth={1.5} />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {challenges.slice(0, 4).map((c) => (
              <ChallengeCard key={c.slug} challenge={c} />
            ))}
          </div>
        </section>
      )}

      {/* ── Final CTA ── */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
        <div className="rounded-2xl bg-fg px-8 py-16 text-center">
          <h2 className="mb-3 text-h1 text-on-action">استعدادت را به گراف اضافه کن</h2>
          <p className="mx-auto mb-8 max-w-lg text-body-lg text-on-action/70">
            پروفایل بساز، پروژه‌هایت را نشان بده و در چالش‌های واقعی سازمان مشارکت کن.
          </p>
          <Link
            href="/login"
            className="inline-block rounded-full bg-highlight px-6 py-3 text-body-lg font-medium text-on-action transition-colors hover:bg-highlight/85"
          >
            ورود به حساب
          </Link>
        </div>
      </section>
    </main>
  );
}
