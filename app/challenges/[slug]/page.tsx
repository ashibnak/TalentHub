import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { FolderKanban } from 'lucide-react';
import { getChallengeBySlug } from '@/lib/db/queries/challenges';
import { Avatar } from '@/components/atoms/Avatar';
import { SpotlightBadge } from '@/components/atoms/SpotlightBadge';
import { EmptyState } from '@/components/atoms/EmptyState';
import { toFaDigits } from '@/lib/format';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const challenge = await getChallengeBySlug(slug);
  return { title: challenge ? `${challenge.title} — AIGraph` : 'چالش پیدا نشد — AIGraph' };
}

export default async function ChallengeDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const challenge = await getChallengeBySlug(slug);
  if (!challenge) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-h1 mb-2">{challenge.title}</h1>
      {challenge.sponsorTeam && <p className="text-body-sm text-info mb-4">{challenge.sponsorTeam}</p>}
      <p className="text-body-lg text-white/80 leading-relaxed mb-8">{challenge.description}</p>

      {/* Problems */}
      <section className="mb-8">
        <h2 className="text-h2 mb-4">مسئله‌ها</h2>
        {challenge.problems.length > 0 ? (
          <div className="flex flex-col gap-3">
            {challenge.problems.map((p) => (
              <div key={p.id} className="bg-surface border border-border-subtle rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-h3 text-white">{p.title}</h3>
                  {p.isSpotlight && <SpotlightBadge />}
                </div>
                <p className="text-body-sm text-white/60 leading-relaxed mb-2">{p.description}</p>
                <span className="inline-flex items-center gap-1 text-body-sm text-text-tertiary">
                  <FolderKanban size={14} strokeWidth={1.5} />
                  {toFaDigits(p.projectCount)} پروژه
                </span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={FolderKanban} title="هنوز مسئله‌ای در این چالش تعریف نشده" />
        )}
      </section>

      {/* Domain experts in this area (plan §3.5) */}
      {challenge.domainExperts.length > 0 && (
        <section>
          <h2 className="text-h2 mb-4">متخصص‌های این حوزه · {toFaDigits(challenge.domainExperts.length)}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {challenge.domainExperts.map((e) => (
              <Link
                key={e.username}
                href={`/u/${e.username}`}
                className="flex items-center gap-3 bg-surface border border-border-subtle rounded-lg p-4 hover:bg-surface-elevated transition-colors"
              >
                <Avatar name={e.name} size={40} />
                <div className="min-w-0">
                  <div className="text-body text-white truncate">{e.name}</div>
                  {e.roleTitle && <div className="text-body-sm text-text-tertiary truncate">{e.roleTitle}</div>}
                  {e.yearsExperience != null && (
                    <div className="text-micro text-info">{toFaDigits(e.yearsExperience)} سال تجربه</div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
