import Link from 'next/link';
import { RoleBadge } from '@/components/atoms/RoleBadge';
import { ideaSummaryLine } from '@/lib/ideas/rules';
import type { DirectoryIdea } from '@/lib/db/queries/ideas';

/**
 * Ideas-directory card: title, the first line of the problem statement, author.
 * The title is a stretched link (its ::after covers the card), matching
 * ProjectListCard, so the whole card is clickable while the challenge chip
 * stays its own link.
 */
export function IdeaCard({ idea }: { idea: DirectoryIdea }) {
  return (
    <div className="relative rounded-lg border border-border-subtle bg-surface p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <h2 className="text-h3 text-fg leading-snug mb-2">
        <Link href={`/ideas/${idea.id}`} className="transition-colors hover:text-info after:absolute after:inset-0">
          {idea.title}
        </Link>
      </h2>
      <p className="text-body-sm text-text-tertiary leading-relaxed mb-3 line-clamp-2">
        {ideaSummaryLine(idea.problemStatement)}
      </p>
      <div className="flex items-center justify-between gap-2 text-body-sm">
        <span className="flex min-w-0 items-center gap-2">
          <span className="text-text-tertiary truncate">{idea.author.name}</span>
          <RoleBadge role={idea.author.roleBadge} />
        </span>
        {idea.challenge && (
          <Link
            href={`/challenges/${idea.challenge.slug}`}
            className="relative z-10 shrink-0 rounded-sm bg-info-subtle px-2 py-0.5 text-micro text-fg transition-colors hover:text-info"
          >
            {idea.challenge.title}
          </Link>
        )}
      </div>
    </div>
  );
}
