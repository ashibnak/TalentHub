import { Sparkles } from 'lucide-react';
import { toFaDigits } from '@/lib/format';

// Match-percentage pill (matching v1: shared skills / required skills).
export function MatchBadge({ pct }: { pct: number }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-info-subtle px-2 py-0.5 text-micro text-info">
      <Sparkles size={11} strokeWidth={1.5} />
      {toFaDigits(pct)}٪ تطابق
    </span>
  );
}
