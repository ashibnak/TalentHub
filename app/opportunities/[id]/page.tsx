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
import { applyAction, updateApplicationStatusAction, setOpportunityStatusAction } from '@/lib/actions/opportunities';
import { getOpportunitySkills, getUserSkillSlugs, getMatchForUsers, getTopCandidates } from '@/lib/db/queries/matching';
import { Avatar } from '@/components/atoms/Avatar';
import { ApplicationStatusPill } from '@/components/atoms/ApplicationStatusPill';
import { EmptyState } from '@/components/atoms/EmptyState';
import { MatchBadge } from '@/components/atoms/MatchBadge';
import { RequirementTag } from '@/components/atoms/RequirementTag';
import { Users } from 'lucide-react';
import { toFaDigits } from '@/lib/format';

export const dynamic = 'force-dynamic';

const inputClass =
  'bg-canvas border border-border focus:border-border-focus focus:bg-info-subtle rounded-md px-3 py-2 text-body text-fg placeholder:text-text-muted outline-none transition-colors';

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
  const ERROR_MESSAGES: Record<string, string> = {
    closed: 'این فرصت بسته شده است.',
    own: 'نمی‌توانی به فرصت خودت اقدام کنی.',
    forbidden: 'اجازه‌ی این کار را نداری.',
  };
  const { id } = await params;
  const sp = await searchParams;
  const opp = await getOpportunityById(id);
  if (!opp) notFound();

  const user = await getCurrentUser();
  const isOwner = !!user && user.id === opp.sponsorId;
  const canManage = isOwner || !!user?.isAdmin;
  const isSeeker = !!user && !isOwner && user.accountType === 'talent' && !user.isAdmin;
  const [myApp, applicants, projectOptions, requirements, mySkillSlugs, topCandidates] = await Promise.all([
    user && !isOwner ? getMyApplication(user.id, id) : null,
    canManage ? getApplicants(id) : [],
    user && !isOwner ? getProjectOptions(user.id) : [],
    getOpportunitySkills(id),
    isSeeker ? getUserSkillSlugs(user.id) : new Set<string>(),
    canManage ? getTopCandidates(id) : [],
  ]);

  // Rank applicants by match score (best-fitting first, ties by recency).
  const applicantMatch = canManage ? await getMatchForUsers(applicants.map((a) => a.userId), id) : new Map();
  const rankedApplicants = [...applicants].sort(
    (a, b) => (applicantMatch.get(b.userId)?.pct ?? -1) - (applicantMatch.get(a.userId)?.pct ?? -1),
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-2 flex items-center gap-2">
        <h1 className="text-h1">{opp.title}</h1>
        {opp.status === 'closed' && (
          <span className="rounded-full bg-fg/5 px-2 py-0.5 text-micro text-text-tertiary">بسته</span>
        )}
      </div>
      {opp.sponsorUsername ? (
        <Link href={`/u/${opp.sponsorUsername}`} className="text-body text-info hover:text-fg transition-colors">
          {opp.sponsorName}
        </Link>
      ) : (
        <span className="text-body text-info">{opp.sponsorName}</span>
      )}
      <p className="mt-1 mb-6 inline-flex items-center gap-1 text-body-sm text-text-tertiary">
        <Users size={14} strokeWidth={1.5} />
        {toFaDigits(opp.applicantCount)} متقاضی
      </p>
      {sp.error && ERROR_MESSAGES[sp.error] && (
        <p className="mb-6 text-body-sm text-red-400">{ERROR_MESSAGES[sp.error]}</p>
      )}

      {canManage && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-subtle bg-surface p-4 shadow-sm">
          <span className="text-body-sm text-text-tertiary">
            {opp.status === 'open' ? 'این فرصت باز است و متقاضی می‌پذیرد.' : 'این فرصت بسته است.'}
          </span>
          <form action={setOpportunityStatusAction}>
            <input type="hidden" name="opportunityId" value={id} />
            <input type="hidden" name="status" value={opp.status === 'open' ? 'closed' : 'open'} />
            <button
              type="submit"
              className="rounded-md border border-border bg-surface px-4 py-2 text-body-sm font-medium text-fg transition-colors hover:bg-canvas"
            >
              {opp.status === 'open' ? 'بستن فرصت' : 'بازگشایی فرصت'}
            </button>
          </form>
        </div>
      )}

      {/* ── Action zone ── */}
      {!user && (
        <div className="rounded-xl border border-border-subtle bg-surface p-6 shadow-sm">
          <p className="mb-3 text-body text-fg">برای اقدام به این فرصت وارد شوید.</p>
          <Link
            href="/login"
            className="inline-block rounded-md bg-action px-4 py-2 text-body font-medium text-on-action shadow-sm transition-colors hover:bg-action-hover"
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
            className="rounded-md bg-action px-4 py-2 text-body font-medium text-on-action shadow-sm transition-colors hover:bg-action-hover"
          >
            ارسال درخواست
          </button>
        </form>
      )}

      {/* ── Required skills (matching basis) ── */}
      {requirements.length > 0 && (
        <section className="mt-8">
          <h2 className="text-h3 mb-3">مهارت‌های موردنیاز</h2>
          <div className="flex flex-wrap gap-2">
            {requirements.map((r) => (
              <RequirementTag key={r.slug} label={r.name} met={isSeeker ? mySkillSlugs.has(r.slug) : undefined} />
            ))}
          </div>
          {isSeeker && (
            <p className="mt-2 text-body-sm text-text-muted">
              {toFaDigits(requirements.filter((r) => mySkillSlugs.has(r.slug)).length)} از {toFaDigits(requirements.length)} مهارت را داری —
              مهارت‌هایت را در <Link href="/settings" className="text-info hover:text-fg transition-colors">تنظیمات</Link> کامل کن.
            </p>
          )}
        </section>
      )}

      {/* ── Description ── */}
      <section className="mt-8">
        <h2 className="text-h3 mb-3">درباره‌ی این فرصت</h2>
        <p className="whitespace-pre-line text-body-lg leading-relaxed text-fg/90">{opp.description}</p>
      </section>

      {/* ── Sponsor/admin: review applicants ── */}
      {canManage && (
        <section className="mt-8">
          <h2 className="text-h2 mb-4">متقاضی‌ها · {toFaDigits(applicants.length)}</h2>
          {applicants.length > 0 ? (
            <div className="flex flex-col gap-3">
              {rankedApplicants.map((a) => (
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
                    {applicantMatch.has(a.userId) && <MatchBadge pct={applicantMatch.get(a.userId)!.pct} />}
                    <ApplicationStatusPill status={a.status} />
                  </div>
                  {a.coverNote && <p className="mb-2 text-body-sm text-text-tertiary leading-relaxed">{a.coverNote}</p>}
                  {a.projectId && a.projectTitle && (
                    <Link href={`/projects/${a.projectId}`} className="mb-3 inline-block text-body-sm text-info hover:text-fg transition-colors">
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

      {/* ── Sponsor/admin: best-matching members who haven't applied ── */}
      {canManage && topCandidates.length > 0 && (
        <section className="mt-8">
          <h2 className="text-h3 mb-1">بهترین‌های گراف برای این فرصت</h2>
          <p className="mb-4 text-body-sm text-text-muted">اعضایی که مهارت‌های موردنیاز را دارند ولی هنوز اقدام نکرده‌اند</p>
          <div className="flex flex-col gap-2">
            {topCandidates.map((c) => (
              <div key={c.userId} className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface p-4">
                <Avatar name={c.name} size={36} />
                <div className="min-w-0 flex-1">
                  {c.username ? (
                    <Link href={`/u/${c.username}`} className="text-body font-medium text-fg hover:text-info transition-colors">
                      {c.name}
                    </Link>
                  ) : (
                    <span className="text-body font-medium text-fg">{c.name}</span>
                  )}
                  {c.roleTitle && <div className="truncate text-body-sm text-text-tertiary">{c.roleTitle}</div>}
                </div>
                <MatchBadge pct={c.match.pct} />
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
