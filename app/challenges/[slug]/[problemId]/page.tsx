import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, FolderKanban } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/session';
import {
  getProblemForSubmission,
  getProblemSubmissions,
  getMySubmittableProjects,
} from '@/lib/db/queries/submissions';
import { SpotlightBadge } from '@/components/atoms/SpotlightBadge';
import { EmptyState } from '@/components/atoms/EmptyState';
import { SubmitProjectPanel } from '@/components/molecules/SubmitProjectPanel';
import { SubmissionCard } from '@/components/molecules/SubmissionCard';
import { toFaDigits } from '@/lib/format';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ problemId: string }> }): Promise<Metadata> {
  const { problemId } = await params;
  const problem = await getProblemForSubmission(problemId);
  return { title: problem ? `${problem.title} — AIGraph` : 'مسئله پیدا نشد — AIGraph' };
}

export default async function ProblemDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; problemId: string }>;
  searchParams: Promise<{ submitted?: string }>;
}) {
  const { slug, problemId } = await params;
  const sp = await searchParams;

  const problem = await getProblemForSubmission(problemId);
  if (!problem || problem.challengeSlug !== slug) notFound();

  const [submissions, user] = await Promise.all([getProblemSubmissions(problemId), getCurrentUser()]);
  const submittable = user ? await getMySubmittableProjects(user.id, problemId) : [];

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Link
        href={`/challenges/${slug}`}
        className="mb-4 inline-flex items-center gap-1 text-body-sm text-info transition-colors hover:text-fg"
      >
        <ArrowRight size={14} strokeWidth={1.5} />
        {problem.challengeTitle}
      </Link>

      <div className="mb-2 flex items-center gap-2">
        <h1 className="text-h1">{problem.title}</h1>
        {problem.isSpotlight && <SpotlightBadge />}
      </div>
      <p className="text-body-lg text-fg/80 leading-relaxed mb-6">{problem.description}</p>

      {sp.submitted && (
        <p className="mb-4 rounded-lg border border-info-muted bg-info-subtle px-4 py-3 text-body-sm text-info">
          پروژه‌ات روی این مسئله ثبت شد.
        </p>
      )}

      {/* ── Submit affordance ── */}
      <section className="mb-8">
        {problem.status !== 'active' ? (
          <p className="text-body-sm text-text-tertiary">این مسئله فعال نیست و پروژه‌ی جدیدی نمی‌پذیرد.</p>
        ) : !user ? (
          <p className="text-body-sm text-text-tertiary">
            برای ثبت پروژه{' '}
            <Link href="/login" className="text-info transition-colors hover:text-fg">
              وارد شو
            </Link>
            .
          </p>
        ) : submittable.length > 0 ? (
          <SubmitProjectPanel
            slug={slug}
            problemId={problemId}
            projects={submittable}
            ipTerms={problem.ipTerms}
            ipTermsNote={problem.ipTermsNote}
          />
        ) : (
          <p className="text-body-sm text-text-tertiary">
            پروژه‌ی منتشرشده‌ای برای ثبت نداری —{' '}
            <Link href="/projects/new" className="text-info transition-colors hover:text-fg">
              یک پروژه بساز
            </Link>
            .
          </p>
        )}
      </section>

      {/* ── Submitted projects ── */}
      <section>
        <h2 className="text-h2 mb-4">پروژه‌های ثبت‌شده · {toFaDigits(submissions.length)}</h2>
        {submissions.length > 0 ? (
          <div className="flex flex-col gap-3">
            {submissions.map((s) => (
              <SubmissionCard key={s.projectId} submission={s} />
            ))}
          </div>
        ) : (
          <EmptyState icon={FolderKanban} title="هنوز پروژه‌ای روی این مسئله ثبت نشده" hint="اولین نفری باش که راه‌حلش را می‌گذارد" />
        )}
      </section>
    </main>
  );
}
