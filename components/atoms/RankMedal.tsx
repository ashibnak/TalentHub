import { toFaDigits } from '@/lib/format';

// Weekly rank indicator. Top 3 get emphasis (this is a recognition board, not a
// hard ranking), the rest are quiet numbers. Neutral/teal tokens only — no
// literal gold/silver so it stays on-theme in the dark palette.
export function RankMedal({ rank }: { rank: number }) {
  const style =
    rank === 1
      ? 'bg-info text-on-action'
      : rank <= 3
        ? 'bg-info-subtle text-info'
        : 'bg-fg/5 text-text-tertiary';
  return (
    <span
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-body-sm font-semibold tabular-nums ${style}`}
      aria-label={`رتبه ${toFaDigits(rank)}`}
    >
      {toFaDigits(rank)}
    </span>
  );
}
