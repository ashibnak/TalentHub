import Link from 'next/link';
import { ShieldCheck, Users, FolderKanban, Target, Wrench, ArrowLeft } from 'lucide-react';
import { getPlatformStats } from '@/lib/db/queries/stats';
import { getChallengesDirectory } from '@/lib/db/queries/challenges';
import { ChallengeCard } from '@/components/molecules/ChallengeCard';
import { LogoMark } from '@/components/layout/LogoMark';
import { toFaDigits } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [stats, challenges] = await Promise.all([getPlatformStats(), getChallengesDirectory()]);

  const statItems = [
    { label: 'عضو', value: stats.members, icon: Users },
    { label: 'پروژه', value: stats.projects, icon: FolderKanban },
    { label: 'چالش', value: stats.challenges, icon: Target },
    { label: 'مهارت تأیید‌شده', value: stats.verifiedSkills, icon: ShieldCheck },
  ];
  const steps = [
    { icon: Wrench, title: 'بساز', text: 'با Cursor، Claude Code و ابزارهای AI پروژه بساز و در پروفایلت منتشر کن.' },
    { icon: ShieldCheck, title: 'تأیید کن', text: 'مهارت‌هایت از روی مخزن GitHub به‌صورت هوشمند و شفاف تأیید می‌شود.' },
    { icon: Users, title: 'دیده شو', text: 'در گراف استعدادها پیدا شو و به مشکلات واقعی سازمان وصل شو.' },
  ];

  return (
    <main className="relative overflow-hidden">
      {/* soft indigo hero glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(79,70,229,0.16),transparent)]"
      />
      <div className="relative mx-auto max-w-5xl px-4">
        {/* ── Hero ── */}
        <section className="pt-16 pb-16 text-center">
          <div className="mb-6 flex justify-center">
            <LogoMark size={64} className="drop-shadow-sm" />
          </div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface px-3 py-1 text-body-sm text-text-tertiary shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            فاز ۱ · نسخه‌ی داخلی
          </div>
          <h1 className="text-display font-bold text-fg mb-4">
            AIGraph<span className="text-action">.</span>
          </h1>
          <p className="mx-auto mb-5 max-w-2xl bg-gradient-to-l from-indigo-600 to-violet-500 bg-clip-text text-h2 text-transparent">
            شبکه‌ی استعدادهای AI ایران
          </p>
          <p className="mx-auto mb-8 max-w-2xl text-body-lg text-text-tertiary">
            گراف زنده‌ی آدم‌هایی که با هوش مصنوعی می‌سازند — مهندس‌هایی که کد می‌زنند و متخصص‌های
            حوزه‌ای که با AI کار می‌کنند. پروفایل بساز، پروژه‌هایت را نشان بده، و مهارت‌هایت را با
            تحلیل هوشمند مخزن GitHub تأیید کن.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/people"
              className="rounded-full bg-action px-6 py-3 text-body-lg font-medium text-white shadow-sm transition-colors hover:bg-action-hover"
            >
              کاوش افراد
            </Link>
            <Link
              href="/opportunities"
              className="rounded-full border border-border bg-surface px-6 py-3 text-body-lg font-medium text-fg shadow-sm transition-colors hover:bg-canvas"
            >
              فرصت‌ها
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-border bg-surface px-6 py-3 text-body-lg font-medium text-fg shadow-sm transition-colors hover:bg-canvas"
            >
              ورود به حساب
            </Link>
          </div>
        </section>

        {/* ── Live stats ── */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          {statItems.map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-xl border border-border-subtle bg-surface p-6 text-center shadow-sm">
              <Icon size={20} strokeWidth={1.5} className="text-info mx-auto mb-2" />
              <div className="text-h1 font-bold text-fg">{toFaDigits(value)}</div>
              <div className="text-body-sm text-text-tertiary mt-1">{label}</div>
            </div>
          ))}
        </section>

        {/* ── How it works ── */}
        <section className="mb-16">
          <h2 className="text-h2 text-center mb-8">چطور کار می‌کند</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {steps.map((s, i) => (
              <div key={s.title} className="rounded-xl border border-border-subtle bg-surface p-6 shadow-sm">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-info-subtle">
                  <s.icon size={20} strokeWidth={1.5} className="text-info" />
                </div>
                <h3 className="text-h3 text-fg mb-1">
                  {toFaDigits(i + 1)}. {s.title}
                </h3>
                <p className="text-body-sm text-text-tertiary leading-relaxed">{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Featured challenges ── */}
        {challenges.length > 0 && (
          <section className="mb-16">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-h2">چالش‌های فعال</h2>
              <Link href="/challenges" className="inline-flex items-center gap-1 text-body-sm text-info hover:text-action transition-colors">
                همه‌ی چالش‌ها
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

        {/* ── Two personas ── */}
        <section className="grid md:grid-cols-2 gap-4 mb-16">
          <div className="rounded-xl border border-border-subtle bg-surface p-6 shadow-sm">
            <h2 className="text-h3 text-fg mb-2">سازنده · Builder</h2>
            <p className="text-body-sm text-text-tertiary leading-relaxed">
              توسعه‌دهنده‌هایی که با Cursor، Claude Code و ابزارهای AI پروژه می‌سازند. مهارت‌هایشان
              از روی مخزن GitHub به‌صورت هوشمند تأیید می‌شود.
            </p>
          </div>
          <div className="rounded-xl border border-border-subtle bg-surface p-6 shadow-sm">
            <h2 className="text-h3 text-fg mb-2">متخصص حوزه · Domain Expert</h2>
            <p className="text-body-sm text-text-tertiary leading-relaxed">
              متخصص‌های HR، مالی، حقوقی و... که از AI در کار حوزه‌ای خود استفاده می‌کنند. بدون نیاز
              به کدنویسی، در کنار سازنده‌ها.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
