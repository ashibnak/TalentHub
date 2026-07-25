import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { LogoMark } from '@/components/layout/LogoMark';
import { getCurrentUser } from '@/lib/auth/session';
import { loginAction } from '@/lib/auth/actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'ورود — AIGraph' };

const inputClass =
  'mt-1 w-full bg-canvas border border-border focus:border-border-focus focus:bg-info-subtle rounded-md px-3 py-2 text-body text-fg placeholder:text-text-muted outline-none transition-colors';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(user.isAdmin ? '/admin' : '/home');

  return (
    <main className="mx-auto flex min-h-[68vh] max-w-sm flex-col justify-center px-4 py-12">
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <LogoMark size={44} />
        <h1 className="text-h2">ورود به AIGraph</h1>
      </div>
      <form action={loginAction} className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface p-6 shadow-sm">
        {error && (
          <p className="text-body-sm text-state-error">
            {error === 'rate_limited'
              ? 'تلاش‌های ناموفق زیاد بود. چند دقیقه صبر کن و دوباره تلاش کن.'
              : 'ایمیل یا رمز عبور نادرست است.'}
          </p>
        )}
        <label className="block text-body-sm text-text-tertiary">
          ایمیل
          <input name="email" type="email" required autoComplete="email" className={inputClass} />
        </label>
        <label className="block text-body-sm text-text-tertiary">
          رمز عبور
          <input name="password" type="password" required autoComplete="current-password" className={inputClass} />
        </label>
        <button
          type="submit"
          className="mt-1 rounded-md bg-action px-4 py-2 text-body font-medium text-on-action shadow-sm transition-colors hover:bg-action-hover"
        >
          ورود
        </button>
      </form>
    </main>
  );
}
