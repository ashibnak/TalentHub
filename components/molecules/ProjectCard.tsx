import { StageBadge, type ProjectStage } from '@/components/atoms/StageBadge';
import { UpvoteButton } from '@/components/atoms/UpvoteButton';

export function ProjectCard({
  projectId,
  title,
  description,
  stage,
  upvotes,
  hasUpvoted,
  isOwn,
  isSignedIn,
}: {
  projectId: string;
  title: string;
  description: string;
  stage: ProjectStage;
  upvotes: number;
  hasUpvoted: boolean;
  isOwn: boolean;
  isSignedIn: boolean;
}) {
  return (
    <div className="bg-surface border border-border-subtle rounded-lg p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-2 mb-2">
        {/* h3: card title under the h2 "پروژه‌ها" section — keeps heading order h1→h2→h3 */}
        <h3 className="text-body font-semibold text-fg leading-snug">{title}</h3>
        <StageBadge stage={stage} />
      </div>
      <p className="text-body-sm text-text-tertiary leading-relaxed mb-3">{description}</p>
      <UpvoteButton projectId={projectId} count={upvotes} hasUpvoted={hasUpvoted} isOwn={isOwn} isSignedIn={isSignedIn} />
    </div>
  );
}
