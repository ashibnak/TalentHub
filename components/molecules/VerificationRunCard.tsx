import Link from 'next/link';
import { Github } from 'lucide-react';
import { VerificationStatusPill } from '@/components/atoms/VerificationStatusPill';
import { retryVerificationAction } from '@/lib/actions/verification';
import { formatFaDateTime, toFaDigits } from '@/lib/format';
import { repoLabel } from '@/lib/github';
import { MAX_FAILED_RUNS, VERIFICATION_CONFIDENCE_THRESHOLD } from '@/lib/verification/rules';
import type { VerificationRunRow } from '@/lib/db/queries/verification';

/**
 * One AI verification run on /admin/verifications: what was checked, what the
 * model said per skill, and a manual re-run.
 *
 * Model / provider / sha / latency stay in Latin script — dense operational
 * metadata (design system §7.4), same call as the admin user table headers.
 */
export function VerificationRunCard({ run, failedRuns }: { run: VerificationRunRow; failedRuns: number }) {
  const verdicts = run.output?.verifications ?? [];

  return (
    <article className="rounded-xl border border-border-subtle bg-surface p-6 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/projects/${run.projectId}`} className="text-h3 text-fg transition-colors hover:text-info">
            {run.projectTitle}
          </Link>
          <p className="mt-1 text-body-sm text-text-tertiary">
            {run.ownerUsername ? (
              <Link href={`/u/${run.ownerUsername}`} className="transition-colors hover:text-info">
                {run.ownerName}
              </Link>
            ) : (
              run.ownerName
            )}
            {' · '}
            {formatFaDateTime(run.createdAt)}
          </p>
        </div>
        <VerificationStatusPill status={run.status} />
      </div>

      {/* Dense metadata row — Latin, monospace-ish alignment via separators. */}
      <div dir="ltr" className="mb-4 flex flex-wrap gap-3 text-micro text-text-muted">
        <span>{run.llmProvider}</span>
        <span>·</span>
        <span>{run.llmModel}</span>
        {run.latencyMs !== null && (
          <>
            <span>·</span>
            <span>{run.latencyMs} ms</span>
          </>
        )}
        {run.totalTokens !== null && (
          <>
            <span>·</span>
            <span>{run.totalTokens} tokens</span>
          </>
        )}
        {run.attempts !== null && run.attempts > 1 && (
          <>
            <span>·</span>
            <span>{run.attempts} attempts</span>
          </>
        )}
        {run.commitSha && (
          <>
            <span>·</span>
            <span>sha {run.commitSha.slice(0, 7)}</span>
          </>
        )}
        {run.githubUrl && (
          <>
            <span>·</span>
            <a
              href={run.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 transition-colors hover:text-info"
            >
              <Github size={12} strokeWidth={1.5} />
              {repoLabel(run.githubUrl)}
            </a>
          </>
        )}
      </div>

      {run.status === 'failed' && run.errorMessage && (
        <p dir="ltr" className="mb-4 rounded-md border border-border-error bg-action-subtle px-3 py-2 text-body-sm text-state-error">
          {run.errorMessage}
        </p>
      )}

      {run.output?.summary && <p className="mb-4 text-body-sm text-fg/80">{run.output.summary}</p>}

      {verdicts.length > 0 && (
        <ul className="mb-4 flex flex-col gap-3">
          {verdicts.map((v) => {
            const passed = v.confidence >= VERIFICATION_CONFIDENCE_THRESHOLD;
            return (
              <li key={v.skill_slug} className="rounded-md border border-border-subtle bg-canvas p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span dir="ltr" className="text-body-sm text-fg">
                    {v.skill_slug}
                  </span>
                  <span className={`text-micro ${passed ? 'text-success' : 'text-text-muted'}`}>
                    {toFaDigits(v.confidence.toFixed(2))}
                  </span>
                </div>
                <p className="text-micro leading-relaxed text-text-tertiary">{v.evidence}</p>
              </li>
            );
          })}
        </ul>
      )}

      {run.status === 'pending' && (
        <p className="mb-4 text-body-sm text-text-tertiary">این اجرا هنوز در جریان است. صفحه را چند لحظه بعد تازه کن.</p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <form action={retryVerificationAction}>
          <input type="hidden" name="projectId" value={run.projectId} />
          <button
            type="submit"
            className="rounded-md border border-border bg-surface px-4 py-2 text-body-sm font-medium text-fg shadow-sm transition-colors hover:bg-surface-elevated"
          >
            اجرای دوباره
          </button>
        </form>
        {failedRuns >= MAX_FAILED_RUNS && (
          <p className="text-micro text-state-error">
            این پروژه {toFaDigits(failedRuns)} بار ناموفق بوده — تلاش خودکار متوقف شده و مهارت‌ها claimed مانده‌اند.
          </p>
        )}
      </div>
    </article>
  );
}
