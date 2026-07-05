import Link from 'next/link';
import { Users, ArrowLeft } from 'lucide-react';
import { toFaDigits } from '@/lib/format';
import { ApplicationStatusPill } from '@/components/atoms/ApplicationStatusPill';
import type { OpportunityListItem, ApplicationStatus } from '@/lib/db/queries/opportunities';

// Opportunities-directory card: title, sponsor, excerpt, applicant count — plus,
// for the signed-in seeker, either their application status or an explicit
// "اقدام کن" call-to-action so the apply flow is discoverable from the list.
export function OpportunityCard({
  opportunity,
  myStatus,
  applyHint = false,
}: {
  opportunity: OpportunityListItem;
  myStatus?: ApplicationStatus | null;
  applyHint?: boolean;
}) {
  return (
    <Link
      href={`/opportunities/${opportunity.id}`}
      className="block bg-surface border border-border-subtle rounded-lg p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <h2 className="text-h3 text-fg mb-1">{opportunity.title}</h2>
      <p className="text-body-sm text-info mb-3">{opportunity.sponsorName}</p>
      <p className="text-body-sm text-text-tertiary leading-relaxed mb-4 line-clamp-2">{opportunity.description}</p>
      <span className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-body-sm text-text-tertiary">
          <Users size={14} strokeWidth={1.5} />
          {toFaDigits(opportunity.applicantCount)} متقاضی
        </span>
        {myStatus ? (
          <ApplicationStatusPill status={myStatus} />
        ) : applyHint ? (
          <span className="inline-flex items-center gap-1 text-body-sm font-medium text-info">
            اقدام کن
            <ArrowLeft size={14} strokeWidth={1.5} />
          </span>
        ) : null}
      </span>
    </Link>
  );
}
