import type { Metadata } from 'next';
import { ShieldCheck } from 'lucide-react';
import { EmptyState } from '@/components/atoms/EmptyState';
import { VerificationRunCard } from '@/components/molecules/VerificationRunCard';
import { getMainOrgId } from '@/lib/db/queries/org';
import { countFailedRunsByProject, listVerificationRuns } from '@/lib/db/queries/verification';
import { isAiConfigured } from '@/lib/ai/gateway';
import { VERIFICATION_CONFIDENCE_THRESHOLD } from '@/lib/verification/rules';
import { toFaDigits } from '@/lib/format';

// Admin-only: the /admin layout calls requireAdmin() for this whole segment.
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'تأیید مهارت‌ها — مدیریت' };

const ERROR_MESSAGES: Record<string, string> = {
  not_eligible: 'این پروژه قابل بررسی نیست — باید منتشرشده باشد و لینک GitHub داشته باشد.',
  no_claimed_skills: 'این پروژه هیچ مهارتی از پروفایل صاحبش ندارد که بررسی شود.',
  already_running: 'یک اجرا همین حالا در جریان است.',
  failsafe_tripped: 'تلاش خودکار برای این پروژه متوقف شده است.',
  missing_project: 'پروژه مشخص نشده است.',
  retry_failed: 'اجرای دوباره با خطا مواجه شد.',
};

export default async function AdminVerificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ retried?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const orgId = await getMainOrgId();
  const runs = orgId ? await listVerificationRuns(orgId) : [];
  const failedByProject = await countFailedRunsByProject([...new Set(runs.map((r) => r.projectId))]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-h1 mb-2">تأیید مهارت‌ها</h1>
      <p className="text-body-sm text-text-tertiary mb-8">
        اجراهای AI روی repo های GitHub. مهارت‌هایی با confidence برابر یا بالاتر از{' '}
        {toFaDigits(VERIFICATION_CONFIDENCE_THRESHOLD)} به‌صورت تأییدشده روی پروفایل ثبت می‌شوند؛ بقیه claimed می‌مانند.
      </p>

      {!isAiConfigured() && (
        <p className="mb-6 rounded-md border border-border-error bg-action-subtle px-3 py-2 text-body-sm text-state-error">
          گیت‌وی AI پیکربندی نشده است — AI_BASE_URL، AI_API_KEY و AI_MODEL را در env تنظیم کن. تا آن زمان همه‌ی اجراها
          ناموفق ثبت می‌شوند.
        </p>
      )}
      {sp.retried && <p className="mb-6 text-body-sm text-success">اجرای دوباره شروع شد.</p>}
      {sp.error && (
        <p className="mb-6 text-body-sm text-state-error">{ERROR_MESSAGES[sp.error] ?? 'خطا در اجرای بررسی.'}</p>
      )}

      {runs.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="هنوز هیچ بررسی‌ای انجام نشده"
          hint="وقتی پروژه‌ای با لینک GitHub و حداقل یک مهارت منتشر شود، بررسی خودکار شروع می‌شود."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {runs.map((run) => (
            <VerificationRunCard key={run.id} run={run} failedRuns={failedByProject.get(run.projectId) ?? 0} />
          ))}
        </div>
      )}
    </main>
  );
}
