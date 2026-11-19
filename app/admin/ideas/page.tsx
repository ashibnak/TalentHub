import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/session';
import { getOrbitQueue } from '@/lib/db/queries/ideas';
import { ORBIT_STAGE_LABEL } from '@/lib/ideas/orbit';
import { IdeaStatusBadge } from '@/components/atoms/IdeaStatusBadge';
import { formatFaDate } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Orbit — مدیریت' };

export default async function AdminIdeasPage() {
  const admin = await requireAdmin();
  const queue = await getOrbitQueue(admin.orgId);

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-h1 mb-2">Orbit</h1>
      <p className="mb-8 text-body-sm text-text-tertiary">ایده‌هایی که در مسیر بررسی هستند. ردشده‌ها و آن‌هایی که به آخر مسیر رسیده‌اند این‌جا نیستند.</p>
      {queue.length === 0 ? (
        <p className="text-body-sm text-text-muted">فعلاً ایده‌ای در این فهرست نیست.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {queue.map((idea) => (
            <li key={idea.id}>
              <Link
                href={`/ideas/${idea.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-subtle bg-surface p-4 shadow-sm transition-colors hover:bg-surface-elevated"
              >
                <span className="min-w-0">
                  <span className="block truncate text-body font-medium text-fg">{idea.title}</span>
                  <span className="text-body-sm text-text-tertiary">
                    {idea.authorName} · {ORBIT_STAGE_LABEL[idea.orbitStage]} · {formatFaDate(idea.updatedAt)}
                  </span>
                </span>
                <IdeaStatusBadge status={idea.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
