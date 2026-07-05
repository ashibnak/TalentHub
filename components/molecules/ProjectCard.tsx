import { ThumbsUp } from 'lucide-react';
import { StageBadge, type ProjectStage } from '@/components/atoms/StageBadge';
import { toFaDigits } from '@/lib/format';

export function ProjectCard({
  title,
  description,
  stage,
  upvotes,
}: {
  title: string;
  description: string;
  stage: ProjectStage;
  upvotes: number;
}) {
  return (
    <div className="bg-surface border border-border-subtle rounded-lg p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-2 mb-2">
        {/* h3: card title under the h2 "پروژه‌ها" section — keeps heading order h1→h2→h3 */}
        <h3 className="text-body font-semibold text-fg leading-snug">{title}</h3>
        <StageBadge stage={stage} />
      </div>
      <p className="text-body-sm text-text-tertiary leading-relaxed mb-3">{description}</p>
      <div className="flex items-center gap-1 text-info text-body-sm">
        <ThumbsUp size={14} strokeWidth={1.5} />
        <span>{toFaDigits(upvotes)}</span>
      </div>
    </div>
  );
}
