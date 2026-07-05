'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell } from 'lucide-react';
import { Logo } from './Logo';
import { logoutAction } from '@/lib/auth/actions';
import { toFaDigits } from '@/lib/format';

const LINKS = [
  { href: '/people', label: 'افراد' },
  { href: '/projects', label: 'پروژه‌ها' },
  { href: '/challenges', label: 'چالش‌ها' },
  { href: '/opportunities', label: 'فرصت‌ها' },
];

export function Nav({ user, unreadCount = 0 }: { user: { name: string; isAdmin: boolean } | null; unreadCount?: number }) {
  const pathname = usePathname();
  const linkClass = (active: boolean) =>
    `text-body-sm transition-colors ${active ? 'font-medium text-fg' : 'text-text-tertiary hover:text-fg'}`;

  return (
    <nav className="sticky top-0 z-20 border-b border-border-subtle bg-surface/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-8 px-4 sm:px-6">
        <Logo />
        <div className="hidden flex-1 items-center gap-6 sm:flex">
          {LINKS.map((l) => {
            const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
            return (
              <Link key={l.href} href={l.href} aria-current={active ? 'page' : undefined} className={linkClass(active)}>
                {l.label}
              </Link>
            );
          })}
        </div>
        <div className="ms-auto flex items-center gap-3 sm:ms-0">
          {user && (
            <Link
              href="/notifications"
              aria-label={unreadCount > 0 ? `اعلان‌ها — ${toFaDigits(unreadCount)} خوانده‌نشده` : 'اعلان‌ها'}
              aria-current={pathname.startsWith('/notifications') ? 'page' : undefined}
              className={`relative transition-colors ${pathname.startsWith('/notifications') ? 'text-fg' : 'text-text-tertiary hover:text-fg'}`}
            >
              <Bell size={18} strokeWidth={1.5} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -end-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-info px-1 text-micro leading-none text-on-action">
                  {unreadCount > 9 ? '۹+' : toFaDigits(unreadCount)}
                </span>
              )}
            </Link>
          )}
          {user?.isAdmin && (
            <Link href="/admin" aria-current={pathname.startsWith('/admin') ? 'page' : undefined} className={linkClass(pathname.startsWith('/admin'))}>
              مدیریت
            </Link>
          )}
          {user && !user.isAdmin && (
            <>
              <Link href="/home" aria-current={pathname === '/home' ? 'page' : undefined} className={linkClass(pathname === '/home')}>
                خانه
              </Link>
              <Link href="/settings" aria-current={pathname.startsWith('/settings') ? 'page' : undefined} className={linkClass(pathname.startsWith('/settings'))}>
                تنظیمات
              </Link>
            </>
          )}
          {user ? (
            <form action={logoutAction}>
              <button type="submit" className="text-body-sm text-text-tertiary transition-colors hover:text-fg">
                خروج
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-action px-4 py-1.5 text-body-sm font-medium text-on-action transition-colors hover:bg-action-hover"
            >
              ورود
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
