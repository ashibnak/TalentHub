import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/session';
import {
  getOpportunityById,
  getMyApplication,
  getApplicants,
  getProjectOptions,
} from '@/lib/db/queries/opportunities';
import { applyAction, updateApplicationStatusAction } from '@/lib/actions/opportunities';
import { Avatar } from '@/components/atoms/Avatar';
import { ApplicationStatusPill } from '@/components/atoms/ApplicationStatusPill';
import { EmptyState } from '@/components/atoms/EmptyState';
import { Users } from 'lucide-react';
import { toFaDigits } from '@/lib/format';

export const dynamic = 'force-dynamic';

const inputClass =
  'bg-surface border border-border focus:border-border-focus focus:bg-info-subtle rounded-md px-3 py-2 text-body text-fg placeholder:text-text-muted outline-none transition-colors';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const opp = await getOpportunityById(id);
  return { title: opp ? `${opp.title} — AIGraph` : 'فرصت پیدا نشد — AIGraph' };
}

export default async function OpportunityDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ applied?: string; error?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const opp = await getOpportunityById(id);
  if (!opp) notFound();

  const user = await getCurrentUser();
  const isOwner = !!user && user.id === opp.sponsorId;
  const canManage = isOwner || !!user?.isAdmin;
  const myApp = user && !isOwner ? await getMyApplication(user.id, id) : null;
  const applicants = canManage ? await getApplicants(id) : [];
  const projectOptions = user && !isOwner && !myApp && opp.status === 'open' ? await getProjectOptions(user.id) : [];

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-2 flex items-center gap-2">
        <h1 className="text-h1">{opp.title}</h1>
        {opp.status === 'closed' && (
          <span className="rounded-full bg-fg/5 px-2 py-0.5 text-micro text-text-tertiary">بسته</span>
        )}
      </div>
      {opp.sponsorUsername ? (
        <Link href={`/u/${opp.sponsorUsername}`} className="text-body text-info hover:text-action transition-colors">
          {opp.sponsorName}
        </Link>
      ) : (
        <span className="text-body text-info">{opp.sponsorName}</span>
      )}
      <p className="mt-1 mb-6 inline-flex items-center gap-1 text-body-sm text-text-tertiary">
        <Users size={14} strokeWidth={1.5} />
        {toFaDigits(opp.applicantCount)} متقاضی
      </p>
      <p className="mb-8 whitespace-pre-line text-body-lg leading-relaxed text-fg/90">{opp.description}</p>

      {/* ── Action zone ── */}
      {!user && (
        <div className="rounded-xl border border-border-subtle bg-surface p-6 shadow-sm">
          <p className="mb-3 text-body text-fg">برای اقدام به این فرصت وارد شوید.</p>
          <Link
            href="/login"
            className="inline-block rounded-md bg-action px-4 py-2 text-body font-medium text-white shadow-sm transition-colors hover:bg-action-hover"
          >
            ورود
          </Link>
        </div>
      )}

      {user && !isOwner && myApp && (
        <div className="flex items-center gap-3 rounded-xl border border-border-subtle bg-surface p-6 shadow-sm">
          {sp.applied && <span className="text-body-sm text-success">درخواست شما ثبت شد.</span>}
          <span className="text-body text-fg">وضعیت درخواست شما:</span>
          <ApplicationStatusPill status={myApp.status} />
        </div>
      )}

      {user && !isOwner && !myApp && opp.status === 'open' && (
        <form action={applyAction} className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface p-6 shadow-sm">
          <h2 className="text-h3">اقدام به این فرصت</h2>
          <input type="hidden" name="opportunityId" value={id} />
          <label className="block text-body-sm text-text-tertiary">
            یادداشت (اختیاری)
            <textarea name="coverNote" rows={3} className={`mt-1 w-full ${inputClass}`} placeholder="چرا برای این فرصت مناسبی؟" />
          </label>
          {projectOptions.length > 0 && (
            <label className="block text-body-sm text-text-tertiary">
              پیوست پروژه (اختیاری)
              <select name="projectId" defaultValue="" className={`mt-1 w-full ${inputClass}`}>
                <option value="">بدون پروژه</option>
                {projectOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button
            type="submit"
            className="rounded-md bg-action px-4 py-2 text-body font-medium text-white shadow-sm transition-colors hover:bg-action-hover"
          >
            ارسال درخواست
          </button>
        </form>
      )}

      {/* ── Sponsor/admin: review applicants ── */}
      {canManage && (
        <section className="mt-4">
          <h2 className="text-h2 mb-4">متقاضی‌ها · {toFaDigits(applicants.length)}</h2>
          {applicants.length > 0 ? (
            <div className="flex flex-col gap-3">
              {applicants.map((a) => (
                <div key={a.applicationId} className="rounded-xl border border-border-subtle bg-surface p-4 shadow-sm">
                  <div className="mb-2 flex items-center gap-3">
                    <Avatar name={a.name} size={36} />
                    <div className="min-w-0 flex-1">
                      {a.username ? (
                        <Link href={`/u/${a.username}`} className="text-body font-medium text-fg hover:text-info transition-colors">
                          {a.name}
                        </Link>
                      ) : (
                        <span className="text-body font-medium text-fg">{a.name}</span>
                      )}
                      {a.roleTitle && <div className="truncate text-body-sm text-text-tertiary">{a.roleTitle}</div>}
                    </div>
                    <ApplicationStatusPill status={a.status} />
                  </div>
                  {a.coverNote && <p className="mb-2 text-body-sm text-text-tertiary leading-relaxed">{a.coverNote}</p>}
                  {a.projectId && a.projectTitle && (
                    <Link href={`/projects/${a.projectId}`} className="mb-3 inline-block text-body-sm text-info hover:text-action transition-colors">
                      پروژه‌ی پیوست: {a.projectTitle}
                    </Link>
                  )}
                  <form action={updateApplicationStatusAction} className="mt-2 flex items-center gap-2">
                    <input type="hidden" name="applicationId" value={a.applicationId} />
                    <select name="status" defaultValue={a.status} aria-label="وضعیت" className={inputClass}>
                      <option value="applied">ارسال‌شده</option>
                      <option value="shortlisted">منتخب اولیه</option>
                      <option value="next_call">دعوت به گفتگو</option>
                      <option value="accepted">پذیرفته‌شده</option>
                      <option value="rejected">رد شده</option>
                    </select>
                    <button
                      type="submit"
                      className="rounded-md border border-border bg-surface px-3 py-2 text-body-sm font-medium text-fg transition-colors hover:bg-canvas"
                    >
                      به‌روزرسانی
                    </button>
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={Users} title="هنوز کسی اقدام نکرده" />
          )}
        </section>
      )}
    </main>
  );
}
