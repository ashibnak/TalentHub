import type { Metadata } from 'next';
import { Users } from 'lucide-react';
import { getPeopleDirectory } from '@/lib/db/queries/users';
import { getFilterFacets } from '@/lib/db/queries/facets';
import { toArray } from '@/lib/db/queries/filters';
import { UserCard } from '@/components/molecules/UserCard';
import { DirectoryFilters } from '@/components/molecules/DirectoryFilters';
import { EmptyState } from '@/components/atoms/EmptyState';
import { toFaDigits } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'افراد — AIGraph' };

type SearchParams = { q?: string; skill?: string | string[]; tool?: string | string[] };

export default async function PeoplePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const filters = {
    q: typeof sp.q === 'string' ? sp.q : undefined,
    skills: toArray(sp.skill),
    tools: toArray(sp.tool),
  };
  const hasFilters = !!(filters.q || filters.skills.length || filters.tools.length);

  const [people, facets] = await Promise.all([getPeopleDirectory(filters), getFilterFacets()]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-h1 mb-6">افراد</h1>
      <DirectoryFilters facets={{ skills: facets.peopleSkills, tools: facets.tools }} />
      <p className="text-body-sm text-text-tertiary mb-6">
        {toFaDigits(people.length)} عضو{hasFilters ? ' یافت شد' : ' در شبکه'}
      </p>
      {people.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {people.map((u) => (
            <UserCard key={u.username} user={u} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title={hasFilters ? 'کسی با این فیلترها پیدا نشد' : 'هنوز عضوی به شبکه نپیوسته'}
          hint={hasFilters ? 'فیلترها را تغییر بده یا پاک کن' : undefined}
        />
      )}
    </main>
  );
}
