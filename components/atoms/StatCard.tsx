import { toFaDigits } from '@/lib/format';

/**
 * One weekly metric. WEEKLY, never cumulative — a lifetime total stops moving
 * after two months and loses all pull, so every number here resets on Saturday.
 *
 * `denominator` exists because a bare rank is illegible and slightly cruel:
 * «۴» says nothing, «۴ از ۱۸» says you are in the top quarter.
 */
export function StatCard({
  label,
  value,
  denominator,
  delta,
  hint,
}: {
  label: string;
  value: number | string;
  denominator?: number;
  /** Week-over-week change. 0 renders nothing rather than «±۰». */
  delta?: number;
  hint?: string;
}) {
  const deltaTone = delta && delta > 0 ? 'text-success' : 'text-text-muted';

  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-4 shadow-sm">
      <p className="text-micro text-text-tertiary mb-2">{label}</p>
      <p className="flex items-baseline gap-1">
        <span className="text-h2 text-fg tabular-nums">{toFaDigits(value)}</span>
        {denominator !== undefined && (
          <span className="text-body-sm text-text-muted">از {toFaDigits(denominator)}</span>
        )}
        {!!delta && (
          <span className={`text-body-sm ${deltaTone}`}>
            {delta > 0 ? '+' : '−'}
            {toFaDigits(Math.abs(delta))}
          </span>
        )}
      </p>
      {hint && <p className="mt-1 text-micro text-text-muted">{hint}</p>}
    </div>
  );
}
