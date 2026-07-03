import { Wrench, Rocket, ThumbsUp } from 'lucide-react';

export type ProjectStage = 'building' | 'shipped';

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
    <div className="bg-[#00314a] border border-[rgba(102,155,188,0.18)] rounded-lg p-4 hover:bg-[#0a3f5c] transition-colors">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-[14px] font-semibold text-white leading-snug">{title}</h4>
        {stage === 'building' ? (
          <span className="inline-flex items-center gap-1 bg-[#669bbc] text-[#00314a] text-[11px] font-medium px-2 py-0.5 rounded-sm shrink-0 whitespace-nowrap">
            <Wrench size={11} strokeWidth={1.5} />
            Building
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 bg-[#C01221] text-white text-[11px] font-medium px-2 py-0.5 rounded-sm shrink-0 whitespace-nowrap">
            <Rocket size={11} strokeWidth={1.5} />
            Shipped
          </span>
        )}
      </div>
      <p className="text-[13px] text-white/60 leading-relaxed mb-3">{description}</p>
      <div className="flex items-center gap-1 text-[#669bbc] text-[13px]">
        <ThumbsUp size={13} strokeWidth={1.5} />
        <span>{upvotes}</span>
      </div>
    </div>
  );
}
