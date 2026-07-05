import Link from 'next/link';
import { Users, ArrowLeft } from 'lucide-react';
import { toFaDigits } from '@/lib/format';
import { ApplicationStatusPill } from '@/components/atoms/ApplicationStatusPill';
import { MatchBadge } from '@/components/atoms/MatchBadge';
import type { OpportunityListItem, ApplicationStatus } from '@/lib/db/queries/opportunities';

// Opportunities-directory card: title, sponsor, excerpt, applicant count — plus,
// for the signed-in seeker, their match score and either their application
// status or an explicit "اقدام کن" call-to-action.
export function OpportunityCard({
  opportunity,
  myStatus,
  applyHint = false,
  matchPct,
  titleAs: TitleTag = 'h2',
}: {
  opportunity: OpportunityListItem;
  myStatus?: ApplicationStatus | null;
  applyHint?: boolean;
  matchPct?: number | null;
  /** 'h3' when the card sits under a section <h2> (e.g. /home) — keeps the outline nested. */
  titleAs?: 'h2' | 'h3';
}) {
  return (
    <Link
      href={`/opportunities/${opportunity.id}`}
      className="block bg-surface border border-border-subtle rounded-lg p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <TitleTag className="text-h3 text-fg mb-1">{opportunity.title}</TitleTag>
      <p className="text-body-sm text-info mb-3">{opportunity.sponsorName}</p>
      <p className="text-body-sm text-text-tertiary leading-relaxed mb-4 line-clamp-2">{opportunity.description}</p>
      <span className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
        <span className="inline-flex items-center gap-2">
          <span className="inline-flex items-center gap-1 whitespace-nowrap text-body-sm text-text-tertiary">
            <Users size={14} strokeWidth={1.5} />
            {toFaDigits(opportunity.applicantCount)} متقاضی
          </span>
          {typeof matchPct === 'number' && <MatchBadge pct={matchPct} />}
        </span>
        {myStatus ? (
          <ApplicationStatusPill status={myStatus} />
        ) : applyHint ? (
          <span className="inline-flex items-center gap-1 whitespace-nowrap text-body-sm font-medium text-info">
            اقدام کن
            <ArrowLeft size={14} strokeWidth={1.5} />
          </span>
        ) : null}
      </span>
    </Link>
  );
}
