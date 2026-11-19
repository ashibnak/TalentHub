import type { Metadata } from 'next';
import Link from 'next/link';
import { Lightbulb, Plus } from 'lucide-react';
import { requireUser } from '@/lib/auth/session';
import { getMyIdeas } from '@/lib/db/queries/ideas';
import { MyIdeaCard } from '@/components/molecules/MyIdeaCard';
import { EmptyState } from '@/components/atoms/EmptyState';
import { btnPrimary } from '@/lib/ui';
import { toFaDigits } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'ایده‌های من — AIGraph' };

/**
 * The author's own ideas, every status including drafts.
 *
 * This page DOES show a list, and that is fine — the anti-anchoring constraint
 * on /ideas/new is about seeing OTHER people's ideas while composing. Your own
 * drafts are the opposite: you need them to pick work back up.
 */
export default async function MyIdeasPage({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const ideas = await getMyIdeas(user.id, user.orgId);

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h1">ایده‌های من</h1>
        <Link href="/ideas/new" className={`inline-flex items-center gap-1 ${btnPrimary}`}>
          <Plus size={16} strokeWidth={1.5} />
          ثبت ایده
        </Link>
      </div>
      <p className="text-body-sm text-text-tertiary mb-6 leading-relaxed">
        پیش‌نویس‌ها و ایده‌هایی که برای بررسی فرستاده‌ای، با وضعیت هر کدام.
      </p>

      {sp.deleted && <p className="mb-6 text-body-sm text-success">پیش‌نویس حذف شد.</p>}

      {ideas.length > 0 ? (
        <>
          <p className="text-body-sm text-text-tertiary mb-6">{toFaDigits(ideas.length)} ایده</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {ideas.map((idea) => (
              <MyIdeaCard key={idea.id} idea={idea} />
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          icon={Lightbulb}
          title="هنوز ایده‌ای این‌جا نیست"
          hint="یک مسئله از کار روزمره‌ات کافی است. لازم نیست از قبل راه‌حل فنی داشته باشی."
        />
      )}
    </main>
  );
}
