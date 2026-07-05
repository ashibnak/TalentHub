import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/session';
import { logoutAction } from '@/lib/auth/actions';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin(); // redirects to /login if not an admin

  return (
    <div>
      <div className="border-b border-border-subtle bg-surface">
        <div className="mx-auto flex h-12 max-w-5xl items-center gap-5 px-4">
          <span className="text-body-sm font-medium text-fg">مدیریت</span>
          <Link href="/admin" className="text-body-sm text-text-tertiary transition-colors hover:text-fg">خانه</Link>
          <Link href="/admin/users" className="text-body-sm text-text-tertiary transition-colors hover:text-fg">کاربران</Link>
          <Link href="/dashboard" className="text-body-sm text-text-tertiary transition-colors hover:text-fg">داشبورد</Link>
          <div className="flex-1" />
          <span className="text-body-sm text-text-muted">{admin.name}</span>
          <form action={logoutAction}>
            <button type="submit" className="text-body-sm text-text-tertiary transition-colors hover:text-fg">
              خروج
            </button>
          </form>
        </div>
      </div>
      {children}
    </div>
  );
}
