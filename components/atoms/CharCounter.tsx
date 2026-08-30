import { toFaDigits } from '@/lib/format';

/**
 * Live character counter for a bounded text field.
 *
 * Three states, because a minimum and a maximum fail differently: still short
 * of the minimum reads as neutral guidance (you are not done yet), over the
 * maximum reads as an error (you must cut something).
 */
export function CharCounter({ current, min = 0, max }: { current: number; min?: number; max: number }) {
  const over = current > max;
  const belowMin = min > 0 && current < min;

  const tone = over ? 'text-state-error' : belowMin ? 'text-text-muted' : 'text-success';
  const target = belowMin ? min : max;

  return (
    <span aria-live="polite" className={`text-micro tabular-nums ${tone}`}>
      {toFaDigits(current)} / {toFaDigits(target)}
    </span>
  );
}
