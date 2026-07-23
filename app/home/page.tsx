import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, FolderKanban } from 'lucide-react';
import { requireUser } from '@/lib/auth/session';
import { getMyProjects } from '@/lib/db/queries/me';
import { StageBadge } from '@/components/atoms/StageBadge';
import { PublishBadge } from '@/components/atoms/PublishBadge';
import { EmptyState } from '@/components/atoms/EmptyState';
import { toFaDigits } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'خانه — AIGraph' };

export default async function HomePage() {
  const user = await requireUser();
  if (user.isAdmin) redirect('/admin');

  const myProjects = await getMyProjects(user.id);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-h1 mb-1">سلام {user.name}</h1>
          <p className="text-body-sm text-text-tertiary">پروژه‌هایت را مدیریت کن و در گراف دیده شو</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-1 rounded-md bg-action px-4 py-2 text-body font-medium text-on-action shadow-sm transition-colors hover:bg-action-hover"
          >
            <Plus size={16} strokeWidth={1.5} />
            پروژه‌ی جدید
          </Link>
          {user.username && (
            <Link
              href={`/u/${user.username}`}
              className="rounded-md border border-border bg-surface px-4 py-2 text-body font-medium text-fg shadow-sm transition-colors hover:bg-surface-elevated"
            >
              پروفایل من
            </Link>
          )}
        </div>
      </div>

      <h2 className="text-h3 mb-4">پروژه‌های من</h2>
      {myProjects.length > 0 ? (
        <div className="flex flex-col gap-2">
          {myProjects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}/edit`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-subtle bg-surface p-4 shadow-sm transition-all hover:bg-surface-elevated hover:border-border"
            >
              <span className="min-w-0 grow truncate text-body text-fg">{p.title}</span>
              <div className="flex shrink-0 items-center gap-2">
                <StageBadge stage={p.stage} />
                <PublishBadge status={p.status} />
                <span className="text-body-sm text-text-tertiary">{toFaDigits(p.upvoteCount)} رأی</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState icon={FolderKanban} title="هنوز پروژه‌ای نساخته‌ای" hint="اولین پروژه‌ات را اضافه کن تا در گراف دیده شوی" />
      )}
    </main>
  );
}
