import { CircleCheck } from 'lucide-react';
import { aiToolLabel } from '@/lib/ai-tools';

// AI-tool tag (design system §5.4) — CircleCheck icon (distinct from the skill
// shield). Tool names stay English (§7.5).
export function AiToolTag({ slug }: { slug: string }) {
  return (
    <span className="inline-flex items-center gap-1 bg-info-subtle text-fg text-micro px-2 py-0.5 rounded-sm">
      <CircleCheck size={11} className="text-info" strokeWidth={1.5} />
      {aiToolLabel(slug)}
    </span>
  );
}
