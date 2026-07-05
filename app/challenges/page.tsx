import type { Metadata } from 'next';
import { Target } from 'lucide-react';
import { getChallengesDirectory } from '@/lib/db/queries/challenges';
import { ChallengeCard } from '@/components/molecules/ChallengeCard';
import { EmptyState } from '@/components/atoms/EmptyState';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'چالش‌ها — AIGraph' };

export default async function ChallengesPage() {
  const challenges = await getChallengesDirectory();
  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-h1 mb-2">چالش‌ها</h1>
      <p className="text-body text-text-tertiary mb-8">
        دسته‌های دامنه‌ای که با هوش مصنوعی حل می‌شوند — از منابع انسانی تا مهندسی
      </p>
      {challenges.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {challenges.map((c) => (
            <ChallengeCard key={c.slug} challenge={c} />
          ))}
        </div>
      ) : (
        <EmptyState icon={Target} title="هنوز چالشی فعال نیست" />
      )}
    </main>
  );
}
