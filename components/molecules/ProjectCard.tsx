import { Wrench, Rocket, ThumbsUp } from 'lucide-react';

export type ProjectStage = 'building' | 'shipped';

// Stage badges use the color ladder from design system §5.4:
// Building = full info-blue, Shipped = action-red. Labels stay English (§7.5).
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
    <div className="bg-surface border border-border-subtle rounded-lg p-4 hover:bg-surface-elevated transition-colors">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-body font-semibold text-white leading-snug">{title}</h4>
        {stage === 'building' ? (
          <span className="inline-flex items-center gap-1 bg-info text-surface text-micro px-2 py-0.5 rounded-sm shrink-0 whitespace-nowrap">
            <Wrench size={11} strokeWidth={1.5} />
            Building
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 bg-action text-white text-micro px-2 py-0.5 rounded-sm shrink-0 whitespace-nowrap">
            <Rocket size={11} strokeWidth={1.5} />
            Shipped
          </span>
        )}
      </div>
      <p className="text-body-sm text-white/60 leading-relaxed mb-3">{description}</p>
      <div className="flex items-center gap-1 text-info text-body-sm">
        <ThumbsUp size={13} strokeWidth={1.5} />
        <span>{upvotes}</span>
      </div>
    </div>
  );
}
