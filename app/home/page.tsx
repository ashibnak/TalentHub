import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Briefcase, Send } from 'lucide-react';
import { requireUser } from '@/lib/auth/session';
import {
  getMyApplications,
  getMyOpportunities,
  getOpportunities,
} from '@/lib/db/queries/opportunities';
import { getMatchScores, getRecommendedOpportunities } from '@/lib/db/queries/matching';
import { getAllSkills } from '@/lib/db/queries/taxonomy';
import { createOpportunityAction } from '@/lib/actions/opportunities';
import { ApplicationStatusPill } from '@/components/atoms/ApplicationStatusPill';
import { OpportunityCard } from '@/components/molecules/OpportunityCard';
import { SkillCheckboxes } from '@/components/molecules/SkillCheckboxes';
import { EmptyState } from '@/components/atoms/EmptyState';
import { toFaDigits } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'خانه — AIGraph' };

const inputClass =
  'bg-canvas border border-border focus:border-border-focus focus:bg-info-subtle rounded-md px-3 py-2 text-body text-fg placeholder:text-text-muted outline-none transition-colors';

export default async function HomePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireUser();
  if (user.isAdmin) redirect('/admin');
  const sp = await searchParams;

  // ── Sponsor home ──
  if (user.accountType === 'sponsor') {
    const [opportunities, allSkills] = await Promise.all([getMyOpportunities(user.id), getAllSkills()]);
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-8 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-h1 mb-1">سلام {user.name}</h1>
            <p className="text-body-sm text-text-tertiary">پنل کارفرما — فرصت بگذار و متقاضی‌ها را بررسی کن</p>
          </div>
          {user.username && (
            <Link
              href={`/u/${user.username}`}
              className="shrink-0 rounded-md border border-border bg-surface px-4 py-2 text-body font-medium text-fg shadow-sm transition-colors hover:bg-surface-elevated"
            >
              پروفایل من
            </Link>
          )}
        </div>

        <section className="mb-8 rounded-xl border border-border-subtle bg-surface p-6 shadow-sm">
          <h2 className="text-h3 mb-4">فرصت جدید</h2>
          {sp.error === 'opp_invalid' && (
            <p className="mb-3 text-body-sm text-red-400">عنوان (حداقل ۳ کاراکتر) و توضیحات (حداقل ۱۰ کاراکتر) را کامل کن.</p>
          )}
          <form action={createOpportunityAction} className="flex flex-col gap-3">
            <label className="block text-body-sm text-text-tertiary">
              عنوان فرصت
              <input name="title" required className={`mt-1 w-full ${inputClass}`} placeholder="مثلاً مهندس هوش مصنوعی" />
            </label>
            <label className="block text-body-sm text-text-tertiary">
              توضیحات
              <textarea name="description" rows={4} required className={`mt-1 w-full ${inputClass}`} placeholder="توضیح نیاز، مهارت‌های لازم و معیار موفقیت" />
            </label>
            <div>
              <div className="mb-2 block text-body-sm text-text-tertiary">
                مهارت‌های موردنیاز — پایه‌ی امتیاز تطابق و پیشنهاد به استعدادها
              </div>
              <SkillCheckboxes name="skills" skills={allSkills} selected={[]} label="مهارت‌های موردنیاز فرصت" />
            </div>
            <button
              type="submit"
              className="self-start rounded-md bg-action px-4 py-2 text-body font-medium text-on-action shadow-sm transition-colors hover:bg-action-hover"
            >
              انتشار فرصت
            </button>
          </form>
        </section>

        <h2 className="text-h3 mb-4">فرصت‌های من</h2>
        {opportunities.length > 0 ? (
          <div className="flex flex-col gap-2">
            {opportunities.map((o) => (
              <Link
                key={o.id}
                href={`/opportunities/${o.id}`}
                className="flex items-center justify-between rounded-xl border border-border-subtle bg-surface p-4 shadow-sm transition-all hover:bg-surface-elevated hover:border-border"
              >
                <span className="truncate text-body text-fg">{o.title}</span>
                <span className="shrink-0 text-body-sm text-text-tertiary">
                  {toFaDigits(o.applicantCount)} متقاضی{o.status === 'closed' ? ' · بسته' : ''}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState icon={Briefcase} title="هنوز فرصتی نگذاشته‌ای" hint="اولین فرصت را از فرم بالا منتشر کن" />
        )}
      </main>
    );
  }

  // ── Talent home ──
  const [apps, openOpps, recommended] = await Promise.all([
    getMyApplications(user.id),
    getOpportunities(),
    getRecommendedOpportunities(user.id),
  ]);
  const statusByOpp = new Map(apps.map((a) => [a.opportunityId, a.status]));
  const matchByOpp = await getMatchScores(user.id, openOpps.map((o) => o.id));
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-h1 mb-1">سلام {user.name}</h1>
          <p className="text-body-sm text-text-tertiary">پیگیری درخواست‌ها و کشف فرصت‌ها</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            href="/projects/new"
            className="rounded-md bg-action px-4 py-2 text-body font-medium text-on-action shadow-sm transition-colors hover:bg-action-hover"
          >
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

      {recommended.length > 0 && (
        <>
          <h2 className="text-h3 mb-1">پیشنهاد برای تو</h2>
          <p className="text-body-sm text-text-muted mb-4">بر اساس مهارت‌هایی که در پروفایلت ثبت کرده‌ای</p>
          <div className="mb-8 grid gap-4 sm:grid-cols-2">
            {recommended.map((o) => (
              <OpportunityCard key={o.id} opportunity={o} matchPct={o.match.pct} applyHint titleAs="h3" />
            ))}
          </div>
        </>
      )}

      <h2 className="text-h3 mb-4">درخواست‌های من</h2>
      {apps.length > 0 ? (
        <div className="mb-8 flex flex-col gap-2">
          {apps.map((a) => (
            <Link
              key={a.id}
              href={`/opportunities/${a.opportunityId}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-border-subtle bg-surface p-4 shadow-sm transition-all hover:bg-surface-elevated hover:border-border"
            >
              <div className="min-w-0">
                <div className="truncate text-body text-fg">{a.opportunityTitle}</div>
                <div className="truncate text-body-sm text-text-muted">{a.sponsorName}</div>
              </div>
              <ApplicationStatusPill status={a.status} />
            </Link>
          ))}
        </div>
      ) : (
        <div className="mb-8">
          <EmptyState icon={Send} title="هنوز درخواستی نداده‌ای" hint="از فرصت‌ها یکی را انتخاب کن و اقدام کن" />
        </div>
      )}

      {openOpps.length > 0 && (
        <>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-h3">فرصت‌های باز</h2>
            <Link href="/opportunities" className="text-body-sm text-info transition-colors hover:text-fg">
              همه
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {openOpps.slice(0, 4).map((o) => (
              <OpportunityCard
                key={o.id}
                opportunity={o}
                myStatus={statusByOpp.get(o.id) ?? null}
                applyHint
                matchPct={matchByOpp.get(o.id)?.pct ?? null}
                titleAs="h3"
              />
            ))}
          </div>
        </>
      )}
    </main>
  );
}
