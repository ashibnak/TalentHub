import { toFaDigits } from '@/lib/format';

// Simple horizontal bar list (no chart library) — label · proportional bar · value.
export function BarList({
  items,
  colorClass = 'bg-action',
}: {
  items: { label: string; value: number }[];
  colorClass?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="flex flex-col gap-2">
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-3">
          <div className="w-28 shrink-0 truncate text-body-sm text-fg" title={it.label}>
            {it.label}
          </div>
          <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-fg/5">
            <div
              className={`absolute inset-y-0 start-0 rounded-md ${colorClass}`}
              style={{ width: `${Math.max(4, (it.value / max) * 100)}%` }}
            />
          </div>
          <div className="w-6 shrink-0 text-end text-body-sm text-text-tertiary tabular-nums">{toFaDigits(it.value)}</div>
        </div>
      ))}
    </div>
  );
}
