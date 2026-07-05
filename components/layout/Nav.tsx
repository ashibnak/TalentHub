'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from './Logo';

// Persian-first nav (design system §6.1). Frosted-glass light bar (Apple-style).
const LINKS = [
  { href: '/people', label: 'افراد' },
  { href: '/projects', label: 'پروژه‌ها' },
  { href: '/challenges', label: 'چالش‌ها' },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="sticky top-0 z-10 border-b border-border-subtle bg-surface/70 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4">
        <Logo />
        <div className="flex flex-1 items-center gap-4">
          {LINKS.map((l) => {
            const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? 'page' : undefined}
                className={`text-body transition-colors ${active ? 'font-medium text-fg' : 'text-text-tertiary hover:text-fg'}`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
