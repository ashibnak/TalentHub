import type { Metadata } from 'next';
import { Briefcase } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/session';
import { getOpportunities, getMyApplications, type ApplicationStatus } from '@/lib/db/queries/opportunities';
import { OpportunityCard } from '@/components/molecules/OpportunityCard';
import { EmptyState } from '@/components/atoms/EmptyState';
import { toFaDigits } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'فرصت‌ها — AIGraph' };

export default async function OpportunitiesPage() {
  const [opportunities, user] = await Promise.all([getOpportunities(), getCurrentUser()]);

  // For a signed-in seeker, annotate each card with their application status —
  // or an explicit apply CTA. Sponsors/admins just browse.
  const isSeeker = !!user && user.accountType === 'talent' && !user.isAdmin;
  const statusByOpp = new Map<string, ApplicationStatus>();
  if (isSeeker) {
    for (const a of await getMyApplications(user.id)) statusByOpp.set(a.opportunityId, a.status);
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-h1 mb-2">فرصت‌ها</h1>
      <p className="text-body-sm text-text-tertiary mb-8">
        {toFaDigits(opportunities.length)} فرصت باز — روی هر فرصت بزن و از همان صفحه اقدام کن
      </p>
      {opportunities.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {opportunities.map((o) => (
            <OpportunityCard
              key={o.id}
              opportunity={o}
              myStatus={statusByOpp.get(o.id) ?? null}
              applyHint={!user || (isSeeker && o.sponsorUsername !== user.username)}
            />
          ))}
        </div>
      ) : (
        <EmptyState icon={Briefcase} title="هنوز فرصتی باز نیست" hint="کارفرماها می‌توانند از «خانه» فرصت جدید بگذارند" />
      )}
    </main>
  );
}
