import type { Metadata } from 'next';
import { Briefcase } from 'lucide-react';
import { getOpportunities } from '@/lib/db/queries/opportunities';
import { OpportunityCard } from '@/components/molecules/OpportunityCard';
import { EmptyState } from '@/components/atoms/EmptyState';
import { toFaDigits } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'فرصت‌ها — AIGraph' };

export default async function OpportunitiesPage() {
  const opportunities = await getOpportunities();
  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-h1 mb-2">فرصت‌ها</h1>
      <p className="text-body-sm text-text-tertiary mb-8">
        {toFaDigits(opportunities.length)} فرصت باز — کارفرماها نیاز می‌گذارند، استعدادها اقدام می‌کنند
      </p>
      {opportunities.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {opportunities.map((o) => (
            <OpportunityCard key={o.id} opportunity={o} />
          ))}
        </div>
      ) : (
        <EmptyState icon={Briefcase} title="هنوز فرصتی باز نیست" hint="کارفرماها می‌توانند از «خانه» فرصت جدید بگذارند" />
      )}
    </main>
  );
}
