import Link from 'next/link';
import { ThumbsUp } from 'lucide-react';
import { StageBadge } from '@/components/atoms/StageBadge';
import { SkillTagList } from '@/components/molecules/SkillTagList';
import { toFaDigits } from '@/lib/format';
import type { DirectoryProject } from '@/lib/db/queries/projects';

// Projects-directory card: title + stage, 2-line description, skills, owner, upvotes.
export function ProjectListCard({ project }: { project: DirectoryProject }) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="block bg-surface border border-border-subtle rounded-lg p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h2 className="text-h3 text-fg leading-snug">{project.title}</h2>
        <StageBadge stage={project.stage} />
      </div>
      <p className="text-body-sm text-text-tertiary leading-relaxed mb-3 line-clamp-2">{project.description}</p>
      {project.skills.length > 0 && (
        <div className="mb-3">
          <SkillTagList tags={project.skills.map((s) => ({ slug: s.slug, label: s.name }))} />
        </div>
      )}
      <div className="flex items-center justify-between text-body-sm">
        <span className="text-text-tertiary truncate">{project.owner.name}</span>
        <span className="flex items-center gap-1 text-info shrink-0">
          <ThumbsUp size={14} strokeWidth={1.5} />
          {toFaDigits(project.upvoteCount)}
        </span>
      </div>
    </Link>
  );
}
