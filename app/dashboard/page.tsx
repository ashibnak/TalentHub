import type { Metadata } from 'next';
import Link from 'next/link';
import { Users, Rocket, FolderKanban, ShieldCheck } from 'lucide-react';
import { getDashboardMetrics } from '@/lib/db/queries/dashboard';
import { BarList } from '@/components/molecules/BarList';
import { Avatar } from '@/components/atoms/Avatar';
import { requireAdmin } from '@/lib/auth/session';
import { toFaDigits } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'داشبورد — AIGraph' };

export default async function DashboardPage() {
  await requireAdmin(); // admin-only
  const m = await getDashboardMetrics();

  const stats = [
    { label: 'اعضا', value: toFaDigits(m.totalMembers), icon: Users },
    { label: 'فعال (پروژه‌دار)', value: toFaDigits(m.activeMembers), icon: Rocket },
    { label: 'پروژه', value: toFaDigits(m.totalProjects), icon: FolderKanban },
    { label: 'نرخ تأیید مهارت', value: `${toFaDigits(m.verificationRate)}٪`, icon: ShieldCheck },
  ];
  const roles = [
    { label: 'سازنده', value: m.roleDistribution.builder },
    { label: 'متخصص حوزه', value: m.roleDistribution.domain_expert },
    { label: 'ترکیبی', value: m.roleDistribution.hybrid },
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-h1 mb-2">داشبورد سازمان</h1>
      <p className="text-body-sm text-text-tertiary mb-8">نمای کلی از استعدادها و فعالیت هوش مصنوعی در سازمان</p>

      {/* Headline metrics */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-border-subtle bg-surface p-6 shadow-sm">
            <Icon size={20} strokeWidth={1.5} className="text-info mb-2" />
            <div className="text-h1 font-bold text-fg">{value}</div>
            <div className="text-body-sm text-text-tertiary mt-1">{label}</div>
          </div>
        ))}
      </section>

      {/* Member composition */}
      <section className="mb-8">
        <h2 className="text-h3 mb-3">ترکیب اعضا</h2>
        <div className="grid grid-cols-3 gap-4">
          {roles.map((r) => (
            <div key={r.label} className="rounded-xl border border-border-subtle bg-surface p-6 text-center shadow-sm">
              <div className="text-h2 font-bold text-fg">{toFaDigits(r.value)}</div>
              <div className="text-body-sm text-text-tertiary mt-1">{r.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Distributions */}
      <section className="grid md:grid-cols-2 gap-4 mb-8">
        <div className="rounded-xl border border-border-subtle bg-surface p-6 shadow-sm">
          <h2 className="text-h3 mb-4">توزیع مهارت‌ها</h2>
          {m.skillDistribution.length > 0 ? (
            <BarList items={m.skillDistribution} colorClass="bg-action" />
          ) : (
            <p className="text-body-sm text-text-muted">داده‌ای نیست</p>
          )}
        </div>
        <div className="rounded-xl border border-border-subtle bg-surface p-6 shadow-sm">
          <h2 className="text-h3 mb-4">استفاده از ابزارهای AI</h2>
          {m.toolAdoption.length > 0 ? (
            <BarList items={m.toolAdoption} colorClass="bg-success" />
          ) : (
            <p className="text-body-sm text-text-muted">داده‌ای نیست</p>
          )}
        </div>
      </section>

      {/* Top builders */}
      <section>
        <h2 className="text-h3 mb-4">برترین سازنده‌ها</h2>
        <div className="overflow-hidden rounded-xl border border-border-subtle bg-surface shadow-sm">
          {m.topBuilders.length > 0 ? (
            m.topBuilders.map((b, i) => (
              <Link
                key={b.username}
                href={`/u/${b.username}`}
                className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-canvas ${i > 0 ? 'border-t border-border-subtle' : ''}`}
              >
                <span className="w-5 text-body-sm text-text-muted tabular-nums">{toFaDigits(i + 1)}</span>
                <Avatar name={b.name} size={32} />
                <span className="flex-1 truncate text-body text-fg">{b.name}</span>
                <span className="text-body-sm text-text-tertiary">{toFaDigits(b.projectCount)} پروژه</span>
              </Link>
            ))
          ) : (
            <p className="px-4 py-6 text-body-sm text-text-muted">هنوز سازنده‌ای پروژه منتشر نکرده</p>
          )}
        </div>
      </section>
    </main>
  );
}
