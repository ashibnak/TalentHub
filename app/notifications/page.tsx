import type { Metadata } from 'next';
import Link from 'next/link';
import { Bell, Briefcase, UserPlus, TrendingUp, type LucideIcon } from 'lucide-react';
import { requireUser } from '@/lib/auth/session';
import { getNotifications, type NotificationItem } from '@/lib/db/queries/notifications';
import { markAllReadAction } from '@/lib/actions/notifications';
import { EmptyState } from '@/components/atoms/EmptyState';
import { btnSecondary } from '@/lib/ui';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'اعلان‌ها — AIGraph' };

const TYPE_ICONS: Record<NotificationItem['type'], LucideIcon> = {
  application_status: TrendingUp,
  new_applicant: UserPlus,
  new_opportunity: Briefcase,
};

// Jalali date-time in Tehran time, Persian digits — e.g. «۱۴ تیر، ۱۸:۳۰».
// (The server runs UTC; without an explicit timeZone every timestamp would be
// off by 3.5h for the entire audience.)
const WHEN_FORMAT = new Intl.DateTimeFormat('fa-IR', {
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Tehran',
});
const formatWhen = (d: Date) => WHEN_FORMAT.format(d);

export default async function NotificationsPage() {
  const user = await requireUser();
  const items = await getNotifications(user.id);
  const hasUnread = items.some((n) => !n.readAt);

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-h1 mb-1">اعلان‌ها</h1>
          <p className="text-body-sm text-text-tertiary">تغییرات درخواست‌ها، متقاضی‌های جدید و فرصت‌های مناسب تو</p>
        </div>
        {hasUnread && (
          <form action={markAllReadAction}>
            <button type="submit" className={btnSecondary}>
              خواندن همه
            </button>
          </form>
        )}
      </div>

      {items.length > 0 ? (
        <div className="flex flex-col gap-2">
          {items.map((n) => {
            const Icon = TYPE_ICONS[n.type];
            const unread = !n.readAt;
            const inner = (
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${unread ? 'bg-info-subtle text-info' : 'bg-fg/5 text-text-muted'}`}>
                  <Icon size={16} strokeWidth={1.5} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`text-body ${unread ? 'font-medium text-fg' : 'text-text-tertiary'}`}>
                    {unread && <span className="sr-only">خوانده‌نشده: </span>}
                    {n.title}
                  </p>
                  {n.body && <p className="mt-0.5 truncate text-body-sm text-text-muted">{n.body}</p>}
                  <p className="mt-1 text-micro text-text-muted">{formatWhen(n.createdAt)}</p>
                </div>
                {unread && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-info" aria-hidden />}
              </div>
            );
            const cardClass = `block rounded-lg border p-4 transition-all ${
              unread ? 'border-info-muted bg-surface' : 'border-border-subtle bg-surface'
            } hover:bg-surface-elevated hover:border-border`;
            return n.href ? (
              <Link key={n.id} href={n.href} className={cardClass}>
                {inner}
              </Link>
            ) : (
              <div key={n.id} className={cardClass}>
                {inner}
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={Bell} title="هنوز اعلانی نداری" hint="وقتی اتفاق تازه‌ای بیفتد، این‌جا خبرش می‌رسد" />
      )}
    </main>
  );
}
