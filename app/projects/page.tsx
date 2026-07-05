import type { Metadata } from 'next';
import { FolderKanban } from 'lucide-react';
import { getProjectsDirectory } from '@/lib/db/queries/projects';
import { getFilterFacets } from '@/lib/db/queries/facets';
import { toArray } from '@/lib/db/queries/filters';
import { ProjectListCard } from '@/components/molecules/ProjectListCard';
import { DirectoryFilters } from '@/components/molecules/DirectoryFilters';
import { EmptyState } from '@/components/atoms/EmptyState';
import { toFaDigits } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'پروژه‌ها — AIGraph' };

type SearchParams = { q?: string; skill?: string | string[]; tool?: string | string[]; sort?: string };

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const filters = {
    q: typeof sp.q === 'string' ? sp.q : undefined,
    skills: toArray(sp.skill),
    tools: toArray(sp.tool),
    sort: sp.sort === 'newest' ? ('newest' as const) : ('upvotes' as const),
  };
  const hasFilters = !!(filters.q || filters.skills.length || filters.tools.length);

  const [projects, facets] = await Promise.all([getProjectsDirectory(filters), getFilterFacets()]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-h1 mb-6">پروژه‌ها</h1>
      <DirectoryFilters facets={{ skills: facets.projectSkills, tools: facets.tools }} showSort />
      <p className="text-body-sm text-text-tertiary mb-6">
        {toFaDigits(projects.length)} پروژه{hasFilters ? ' یافت شد' : '‌ی منتشرشده'}
      </p>
      {projects.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((p) => (
            <ProjectListCard key={p.id} project={p} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FolderKanban}
          title={hasFilters ? 'پروژه‌ای با این فیلترها پیدا نشد' : 'هنوز پروژه‌ای منتشر نشده'}
          hint={hasFilters ? 'فیلترها را تغییر بده یا پاک کن' : undefined}
        />
      )}
    </main>
  );
}
