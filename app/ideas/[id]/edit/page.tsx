import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { requireUser } from '@/lib/auth/session';
import { getIdeaById, getIdeaChallengeOptions } from '@/lib/db/queries/ideas';
import { updateIdeaAction } from '@/lib/actions/ideas';
import { editRejection } from '@/lib/ideas/rules';
import { IdeaForm } from '@/components/molecules/IdeaForm';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'ویرایش ایده — AIGraph' };

/**
 * Owner-only edit, open until a final decision (approved/rejected) — same guard
 * as the action (lib/ideas/rules.ts), so the page never renders a form the
 * action would reject.
 *
 * Like /ideas/new, this page shows no other ideas.
 */
export default async function EditIdeaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const idea = await getIdeaById(id);
  if (!idea) notFound();

  const rejection = editRejection({ currentUserId: user.id, idea });
  if (rejection === 'not_owner') notFound(); // don't confirm someone else's idea exists
  if (rejection) redirect(`/ideas/${id}?error=${rejection}`);

  const challenges = await getIdeaChallengeOptions(user.orgId);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Link href={`/ideas/${id}`} className="text-body-sm text-text-tertiary transition-colors hover:text-fg">
        → بازگشت به ایده
      </Link>
      <h1 className="text-h1 mb-1 mt-3">ویرایش ایده</h1>
      <p className="text-body-sm text-text-tertiary mb-8">تا وقتی تصمیم نهایی گرفته نشده، می‌توانی هر بخش را روشن‌تر کنی.</p>

      <section className="rounded-xl border border-border-subtle bg-surface p-6 shadow-sm">
        <IdeaForm
          action={updateIdeaAction}
          challenges={challenges}
          submitLabel="ذخیره‌ی تغییرات"
          ideaId={idea.id}
          initialValues={{
            title: idea.title,
            problemStatement: idea.problemStatement,
            proposedSolution: idea.proposedSolution,
            targetUsers: idea.targetUsers,
            successCriteria: idea.successCriteria,
            feasibilityNote: idea.feasibilityNote ?? '',
            currentWorkaround: idea.currentWorkaround ?? '',
            whyAgent: idea.whyAgent ?? '',
            dataNeeded: idea.dataNeeded ?? '',
            teamCapability: idea.teamCapability ?? '',
            challengeId: idea.challenge?.id ?? '',
            ipTerms: idea.ipTerms,
          }}
        />
      </section>
    </main>
  );
}
