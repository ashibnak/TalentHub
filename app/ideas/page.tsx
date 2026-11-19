import type { Metadata } from 'next';
import Link from 'next/link';
import { Lightbulb, Plus } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/session';
import { getMainOrgId } from '@/lib/db/queries/org';
import { getIdeasDirectory, getIdeaChallengeOptions } from '@/lib/db/queries/ideas';
import { IdeaCard } from '@/components/molecules/IdeaCard';
import { IdeaChallengeFilter } from '@/components/molecules/IdeaChallengeFilter';
import { EmptyState } from '@/components/atoms/EmptyState';
import { btnPrimary, btnSecondary } from '@/lib/ui';
import { toFaDigits } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'ایده‌ها — AIGraph' };

/** Public directory: APPROVED ideas only, newest first, filterable by challenge. */
export default async function IdeasPage({ searchParams }: { searchParams: Promise<{ challenge?: string }> }) {
  const sp = await searchParams;
  const challengeSlug = typeof sp.challenge === 'string' && sp.challenge ? sp.challenge : undefined;

  const viewer = await getCurrentUser();
  const orgId = await getMainOrgId();
  const [ideas, challenges] = await Promise.all([
    orgId ? getIdeasDirectory(orgId, challengeSlug) : Promise.resolve([]),
    orgId ? getIdeaChallengeOptions(orgId) : Promise.resolve([]),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h1">ایده‌ها</h1>
        {viewer && (
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/ideas/mine" className={btnSecondary}>
              ایده‌های من
            </Link>
            <Link href="/ideas/new" className={`inline-flex items-center gap-1 ${btnPrimary}`}>
              <Plus size={16} strokeWidth={1.5} />
              ثبت ایده
            </Link>
          </div>
        )}
      </div>
      <p className="text-body-sm text-text-tertiary mb-6 leading-relaxed">
        ایده‌هایی که هنوز به پروژه تبدیل نشده‌اند. برای اثر گذاشتن، لازم نیست کد بزنی.
      </p>

      <IdeaChallengeFilter challenges={challenges} />

      <p className="text-body-sm text-text-tertiary mb-6">
        {toFaDigits(ideas.length)} ایده{challengeSlug ? ' یافت شد' : '‌ی تأییدشده'}
      </p>

      {ideas.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {ideas.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Lightbulb}
          title={challengeSlug ? 'برای این چالش هنوز ایده‌ی تأییدشده‌ای نیست' : 'هنوز ایده‌ی تأییدشده‌ای نیست'}
          hint={challengeSlug ? 'فیلتر را بردار تا همه‌ی ایده‌ها را ببینی.' : 'اگر مسئله‌ای از کارت داری، می‌توانی اولین ایده را ثبت کنی.'}
        />
      )}
    </main>
  );
}
