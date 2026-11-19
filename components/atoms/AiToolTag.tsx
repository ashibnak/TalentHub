import { aiToolLabel } from '@/lib/ai-tools';

// AI-tool tag. Plain Latin label — a leading check on every tool read as a
// hollow dot and did not mean "verified". Verification stays on skill tags.
export function AiToolTag({ slug }: { slug: string }) {
  return (
    <span className="inline-flex items-center bg-info-subtle font-latin text-fg text-micro px-2 py-0.5 rounded-sm">
      {aiToolLabel(slug)}
    </span>
  );
}
