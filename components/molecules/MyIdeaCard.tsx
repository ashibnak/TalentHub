import Link from 'next/link';
import { IdeaStatusBadge } from '@/components/atoms/IdeaStatusBadge';
import { ideaSummaryLine } from '@/lib/ideas/rules';
import { formatFaDate } from '@/lib/format';
import type { MyIdea } from '@/lib/db/queries/ideas';

/**
 * One of the author's own ideas on /ideas/mine. Unlike IdeaCard (public,
 * approved-only, shows the author) this always shows STATUS — the whole reason
 * the page exists is to answer "where did my submission get to?".
 */
export function MyIdeaCard({ idea }: { idea: MyIdea }) {
  return (
    <div className="relative rounded-lg border border-border-subtle bg-surface p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-2 flex items-start justify-between gap-3">
        <h2 className="text-h3 text-fg leading-snug">
          <Link href={`/ideas/${idea.id}`} className="transition-colors hover:text-info after:absolute after:inset-0">
            {idea.title}
          </Link>
        </h2>
        <IdeaStatusBadge status={idea.status} />
      </div>
      <p className="text-body-sm text-text-tertiary leading-relaxed mb-3 line-clamp-2">
        {ideaSummaryLine(idea.problemStatement)}
      </p>
      <div className="flex flex-wrap items-center gap-2 text-micro text-text-muted">
        <span>{formatFaDate(idea.createdAt)}</span>
        {idea.challenge && (
          <>
            <span>·</span>
            <span>{idea.challenge.title}</span>
          </>
        )}
      </div>
    </div>
  );
}
