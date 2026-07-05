import Link from 'next/link';
import { Users } from 'lucide-react';
import { toFaDigits } from '@/lib/format';
import type { OpportunityListItem } from '@/lib/db/queries/opportunities';

// Opportunities-directory card: title, sponsor, excerpt, applicant count.
export function OpportunityCard({ opportunity }: { opportunity: OpportunityListItem }) {
  return (
    <Link
      href={`/opportunities/${opportunity.id}`}
      className="block bg-surface border border-border-subtle rounded-lg p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <h2 className="text-h3 text-fg mb-1">{opportunity.title}</h2>
      <p className="text-body-sm text-info mb-3">{opportunity.sponsorName}</p>
      <p className="text-body-sm text-text-tertiary leading-relaxed mb-4 line-clamp-2">{opportunity.description}</p>
      <span className="inline-flex items-center gap-1 text-body-sm text-text-tertiary">
        <Users size={14} strokeWidth={1.5} />
        {toFaDigits(opportunity.applicantCount)} متقاضی
      </span>
    </Link>
  );
}
