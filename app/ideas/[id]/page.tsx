import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { getIdeaById } from '@/lib/db/queries/ideas';
import { getCurrentUser } from '@/lib/auth/session';
import { submitIdeaAction, deleteIdeaAction } from '@/lib/actions/ideas';
import { canDelete, canEdit, canSubmit, canViewIdea } from '@/lib/ideas/rules';
import { IdeaStatusBadge } from '@/components/atoms/IdeaStatusBadge';
import { IdeaIpTerms } from '@/components/molecules/IdeaIpTerms';
import { btnPrimary, btnSecondary } from '@/lib/ui';
import { formatFaDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const idea = await getIdeaById(id);
  return { title: idea ? `${idea.title} — AIGraph` : 'ایده پیدا نشد — AIGraph' };
}

const ERROR_MESSAGES: Record<string, string> = {
  not_found: 'این ایده پیدا نشد.',
  not_owner: 'این ایده متعلق به تو نیست.',
  not_draft: 'این ایده قبلاً ثبت شده است.',
  locked: 'درباره‌ی این ایده تصمیم نهایی گرفته شده است.',
  internal: 'مشکلی پیش آمد. دوباره تلاش کن.',
};

/** One labelled block of the idea. Section titles are Persian (design system §7.5). */
function Section({ title, body }: { title: string; body: string }) {
  return (
    <section>
      <h2 className="text-body-sm text-text-tertiary mb-2">{title}</h2>
      <p className="text-body text-fg/90 leading-relaxed whitespace-pre-line">{body}</p>
    </section>
  );
}

export default async function IdeaDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; submitted?: string; error?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const viewer = await getCurrentUser();
  const idea = await getIdeaById(id);
  if (!idea) notFound();

  // Approved ideas are public; anything earlier is the author's alone until then.
  if (!canViewIdea(idea.status, idea.userId, viewer?.id ?? null)) notFound();

  const guard = { currentUserId: viewer?.id ?? '', idea };
  const isOwner = !!viewer && viewer.id === idea.userId;
  const editable = isOwner && canEdit(guard);
  const submittable = isOwner && canSubmit(guard);
  const deletable = isOwner && canDelete(guard);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/ideas" className="text-body-sm text-text-tertiary transition-colors hover:text-fg">
        → همه‌ی ایده‌ها
      </Link>

      <div className="mt-3 mb-3 flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-h1 leading-tight">{idea.title}</h1>
        {/* The status badge is meaningful only to the author — a public reader
            of an approved idea doesn't need to be told it was approved. */}
        {isOwner && <IdeaStatusBadge status={idea.status} />}
      </div>

      <p className="text-body-sm text-text-tertiary mb-6">
        {idea.author.username ? (
          <Link href={`/u/${idea.author.username}`} className="transition-colors hover:text-info">
            {idea.author.name}
          </Link>
        ) : (
          idea.author.name
        )}
        {' · '}
        {formatFaDate(idea.createdAt)}
        {idea.challenge && (
          <>
            {' · '}
            <Link href={`/challenges/${idea.challenge.slug}`} className="transition-colors hover:text-info">
              {idea.challenge.title}
            </Link>
          </>
        )}
      </p>

      {sp.saved && <p className="mb-6 text-body-sm text-success">ایده ذخیره شد.</p>}
      {sp.submitted && (
        <p className="mb-6 text-body-sm text-success">
          ایده ثبت شد و در نوبت بررسی قرار گرفت. تا وقتی تصمیم نهایی گرفته نشده، می‌توانی ویرایشش کنی.
        </p>
      )}
      {sp.error && (
        <p className="mb-6 text-body-sm text-state-error">{ERROR_MESSAGES[sp.error] ?? ERROR_MESSAGES.internal}</p>
      )}

      <div className="flex flex-col gap-6 rounded-xl border border-border-subtle bg-surface p-6 shadow-sm">
        <Section title="مسئله چیست؟" body={idea.problemStatement} />
        <Section title="راه‌حل پیشنهادی" body={idea.proposedSolution} />
        <Section title="چه کسانی استفاده می‌کنند؟" body={idea.targetUsers} />
        <Section title="از کجا بفهمیم موفق شده؟" body={idea.successCriteria} />
        {idea.feasibilityNote && <Section title="نکته‌ی اجرایی" body={idea.feasibilityNote} />}
      </div>

      {/* Ownership position declared at intake — plain Persian, shared wording. */}
      <div className="mt-6">
        <IdeaIpTerms ipTerms={idea.ipTerms} />
      </div>

      {isOwner && idea.reviewNote && (
        <div className="mt-6 rounded-xl border border-border-subtle bg-surface p-6 shadow-sm">
          <h2 className="text-body-sm text-text-tertiary mb-2">یادداشت بررسی</h2>
          <p className="text-body text-fg/90 leading-relaxed whitespace-pre-line">{idea.reviewNote}</p>
        </div>
      )}

      {/* Owner controls. Editing stays open until a final decision; submitting
          and deleting are draft-only. */}
      {isOwner && (editable || submittable || deletable) && (
        <div className="mt-8 flex flex-wrap items-center gap-3">
          {submittable && (
            <form action={submitIdeaAction}>
              <input type="hidden" name="ideaId" value={idea.id} />
              <button type="submit" className={btnPrimary}>
                ثبت نهایی برای بررسی
              </button>
            </form>
          )}
          {editable && (
            <Link href={`/ideas/${idea.id}/edit`} className={`inline-flex items-center gap-2 ${btnSecondary}`}>
              <Pencil size={16} strokeWidth={1.5} />
              ویرایش
            </Link>
          )}
          {deletable && (
            <form action={deleteIdeaAction}>
              <input type="hidden" name="ideaId" value={idea.id} />
              <button type="submit" className="text-body-sm text-text-muted transition-colors hover:text-state-error">
                حذف پیش‌نویس
              </button>
            </form>
          )}
          {submittable && (
            <p className="text-body-sm text-text-muted">پس از ثبت نهایی، در نوبت بررسی قرار می‌گیرد.</p>
          )}
        </div>
      )}
    </main>
  );
}
