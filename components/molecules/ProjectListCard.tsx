import Link from 'next/link';
import { StageBadge } from '@/components/atoms/StageBadge';
import { SkillTagList } from '@/components/molecules/SkillTagList';
import { UpvoteButton } from '@/components/atoms/UpvoteButton';
import type { DirectoryProject } from '@/lib/db/queries/projects';

// Projects-directory card: title + stage, 2-line description, skills, owner, upvote toggle.
// The title is a "stretched link" (its ::after overlays the whole card), so the
// card is clickable while the UpvoteButton stays an independent control above it.
export function ProjectListCard({ project, viewerId }: { project: DirectoryProject; viewerId?: string | null }) {
  const isOwn = !!viewerId && viewerId === project.ownerId;
  return (
    <div className="relative bg-surface border border-border-subtle rounded-lg p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h2 className="text-h3 text-fg leading-snug">
          <Link href={`/projects/${project.id}`} className="transition-colors hover:text-info after:absolute after:inset-0">
            {project.title}
          </Link>
        </h2>
        <StageBadge stage={project.stage} />
      </div>
      <p className="text-body-sm text-text-tertiary leading-relaxed mb-3 line-clamp-2">{project.description}</p>
      {project.skills.length > 0 && (
        <div className="mb-3">
          <SkillTagList tags={project.skills.map((s) => ({ slug: s.slug, label: s.name }))} />
        </div>
      )}
      <div className="flex items-center justify-between gap-2 text-body-sm">
        <span className="text-text-tertiary truncate">{project.owner.name}</span>
        <span className="relative z-10 shrink-0">
          <UpvoteButton
            projectId={project.id}
            count={project.upvoteCount}
            hasUpvoted={project.hasUpvoted}
            isOwn={isOwn}
            isSignedIn={!!viewerId}
          />
        </span>
      </div>
    </div>
  );
}
