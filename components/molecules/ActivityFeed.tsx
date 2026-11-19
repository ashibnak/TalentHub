import Link from 'next/link';
import { Avatar } from '@/components/atoms/Avatar';
import { formatFaRelative, toFaDigits } from '@/lib/format';
import type { ActivityEvent } from '@/lib/db/queries/home';

/**
 * Block 7 — the last few things people did across the org.
 *
 * Phrasing is PERSON-CENTRIC: «مریم یک ایده ثبت کرد», never «۳ رکورد اضافه شد».
 * A system-centric feed reads like a log and nobody returns to a log; a
 * person-centric one reads like a room with people in it.
 */
function phrase(e: ActivityEvent): string {
  switch (e.kind) {
    case 'idea_submitted':
      return 'یک ایده ثبت کرد';
    case 'project_submitted':
      return 'پروژه‌ای روی یک مسئله ثبت کرد';
    case 'skills_verified':
      return `${toFaDigits(e.count)} مهارتش تأیید شد`;
    case 'spotlight_won':
      return 'برنده‌ی Spotlight شد';
  }
}

export function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  if (events.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="text-h3 text-fg mb-4">در سازمان چه خبر است</h2>
      <div className="flex flex-col gap-3">
        {events.map((e) => (
          <div key={`${e.kind}-${e.id}`} className="flex items-start gap-3">
            <Avatar seed={e.actorUsername ?? e.actorName} size={32} />
            <div className="min-w-0 flex-1">
              <p className="text-body-sm text-fg leading-relaxed">
                {e.actorUsername ? (
                  <Link href={`/u/${e.actorUsername}`} className="font-medium transition-colors hover:text-info">
                    {e.actorName}
                  </Link>
                ) : (
                  <span className="font-medium">{e.actorName}</span>
                )}{' '}
                <span className="text-text-tertiary">{phrase(e)}</span>
              </p>
              <p className="truncate text-micro text-text-muted">
                {e.subject}
                {e.context && ` · ${e.context}`}
                {' · '}
                {formatFaRelative(e.at)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
