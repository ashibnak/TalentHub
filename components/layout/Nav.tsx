'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from './Logo';
import { logoutAction } from '@/lib/auth/actions';

const LINKS = [
  { href: '/people', label: 'افراد' },
  { href: '/projects', label: 'پروژه‌ها' },
  { href: '/challenges', label: 'چالش‌ها' },
];

export function Nav({ user }: { user: { name: string; isAdmin: boolean } | null }) {
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
