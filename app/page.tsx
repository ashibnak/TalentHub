import Link from 'next/link';
import { ShieldCheck, Users, FolderKanban, Target } from 'lucide-react';
import { getPlatformStats } from '@/lib/db/queries/stats';
import { toFaDigits } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const stats = await getPlatformStats();
  const statItems = [
    { label: 'عضو', value: stats.members, icon: Users },
    { label: 'پروژه', value: stats.projects, icon: FolderKanban },
    { label: 'چالش', value: stats.challenges, icon: Target },
    { label: 'مهارت تأیید‌شده', value: stats.verifiedSkills, icon: ShieldCheck },
  ];

  return (
    <main className="mx-auto max-w-5xl px-4">
      {/* ── Hero ── */}
      <section className="py-16 text-center">
        <h1 className="text-display font-bold mb-4">
          AIGraph<span className="text-action">.</span>
        </h1>
        <p className="text-h2 text-info mb-4">شبکه‌ی استعدادهای AI ایران</p>
        <p className="text-body-lg text-white/80 max-w-2xl mx-auto mb-8">
          گراف زنده‌ی آدم‌هایی که با هوش مصنوعی می‌سازند — مهندس‌هایی که کد می‌زنند و متخصص‌های
          حوزه‌ای که با AI کار می‌کنند. پروفایل بساز، پروژه‌هایت را نشان بده، و مهارت‌هایت را با
          تحلیل هوشمند مخزن GitHub تأیید کن.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/people"
            className="bg-action hover:bg-action-hover text-white px-6 py-3 rounded-md text-body-lg font-medium transition-colors"
          >
            کاوش افراد
          </Link>
          <Link
            href="/projects"
            className="bg-transparent text-white border border-border hover:bg-info-subtle px-6 py-3 rounded-md text-body-lg font-medium transition-colors"
          >
            دیدن پروژه‌ها
          </Link>
          <Link
            href="/challenges"
            className="bg-transparent text-white border border-border hover:bg-info-subtle px-6 py-3 rounded-md text-body-lg font-medium transition-colors"
          >
            چالش‌ها
          </Link>
        </div>
      </section>

      {/* ── Live stats ── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
        {statItems.map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-surface border border-border-subtle rounded-lg p-6 text-center">
            <Icon size={20} strokeWidth={1.5} className="text-info mx-auto mb-2" />
            <div className="text-h1 font-bold text-white">{toFaDigits(value)}</div>
            <div className="text-body-sm text-text-tertiary mt-1">{label}</div>
          </div>
        ))}
      </section>

      {/* ── Two personas ── */}
      <section className="grid md:grid-cols-2 gap-4 mb-16">
        <div className="bg-surface border border-border-subtle rounded-lg p-6">
          <h2 className="text-h3 text-white mb-2">سازنده · Builder</h2>
          <p className="text-body-sm text-white/70 leading-relaxed">
            توسعه‌دهنده‌هایی که با Cursor، Claude Code و ابزارهای AI پروژه می‌سازند. مهارت‌هایشان
            از روی مخزن GitHub به‌صورت هوشمند تأیید می‌شود.
          </p>
        </div>
        <div className="bg-surface border border-border-subtle rounded-lg p-6">
          <h2 className="text-h3 text-white mb-2">متخصص حوزه · Domain Expert</h2>
          <p className="text-body-sm text-white/70 leading-relaxed">
            متخصص‌های HR، مالی، حقوقی و... که از AI در کار حوزه‌ای خود استفاده می‌کنند. بدون نیاز
            به کدنویسی، در کنار سازنده‌ها.
          </p>
        </div>
      </section>
    </main>
  );
}
