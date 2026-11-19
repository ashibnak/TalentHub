import Link from 'next/link';
import { pickSpotlightWinnerAction } from '@/lib/actions/spotlight';
import { inputClass, btnPrimary } from '@/lib/ui';
import { formatFaDate, toFaDigits } from '@/lib/format';
import type { ExpiredSpotlight } from '@/lib/db/queries/spotlight';

/**
 * One closed Spotlight window awaiting a winner.
 *
 * The picker lists ONLY projects actually linked to this problem — the same
 * allowlist canPickWinner() enforces server-side, so the form can't even offer
 * an invalid choice. A problem whose window closed with zero submissions gets a
 * plain explanation instead of an empty dropdown.
 */
export function SpotlightWinnerPicker({ spotlight }: { spotlight: ExpiredSpotlight }) {
  const { candidates } = spotlight;

  return (
    <article className="rounded-lg border border-border-subtle bg-canvas p-4">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <Link
          href={`/challenges/${spotlight.challengeSlug}/${spotlight.problemId}`}
          className="text-body font-medium text-fg transition-colors hover:text-info"
        >
          {spotlight.title}
        </Link>
        <span className="text-micro text-text-muted">پایان {formatFaDate(spotlight.endsAt)}</span>
      </div>
      <p className="mb-3 text-body-sm text-text-tertiary">
        {spotlight.challengeTitle} · {toFaDigits(candidates.length)} پروژه‌ی ثبت‌شده
      </p>

      {candidates.length === 0 ? (
        <p className="text-body-sm text-text-muted">
          هیچ پروژه‌ای روی این مسئله ثبت نشده — برنده‌ای برای انتخاب وجود ندارد.
        </p>
      ) : (
        <form action={pickSpotlightWinnerAction} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="problemId" value={spotlight.problemId} />
          <label className="min-w-0 grow text-body-sm text-text-tertiary">
            پروژه‌ی برنده
            <select name="projectId" defaultValue="" required className={`mt-1 w-full ${inputClass}`}>
              <option value="" disabled>
                یک پروژه انتخاب کن
              </option>
              {candidates.map((c) => (
                <option key={c.projectId} value={c.projectId}>
                  {c.title} — {c.ownerName} ({toFaDigits(c.upvoteCount)} رأی)
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className={btnPrimary}>
            ثبت برنده
          </button>
        </form>
      )}
    </article>
  );
}
