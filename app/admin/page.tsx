import type { Metadata } from 'next';
import Link from 'next/link';
import { Users, LayoutDashboard } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'مدیریت — AIGraph' };

const cards = [
  { href: '/admin/users', title: 'کاربران', desc: 'ایجاد و مدیریت کاربران بر اساس نقش', icon: Users },
  { href: '/dashboard', title: 'داشبورد سازمان', desc: 'متریک‌های کل سازمان', icon: LayoutDashboard },
];

export default function AdminHome() {
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
    </main>
  );
}
