import type { Metadata } from 'next';
import { FolderKanban } from 'lucide-react';
import { getProjectsDirectory } from '@/lib/db/queries/projects';
import { ProjectListCard } from '@/components/molecules/ProjectListCard';
import { EmptyState } from '@/components/atoms/EmptyState';
import { toFaDigits } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'پروژه‌ها — AIGraph' };

export default async function ProjectsPage() {
  const projects = await getProjectsDirectory();
  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-h1 mb-2">پروژه‌ها</h1>
      <p className="text-body text-text-tertiary mb-8">{toFaDigits(projects.length)} پروژه‌ی منتشرشده</p>
      {projects.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((p) => (
            <ProjectListCard key={p.id} project={p} />
          ))}
        </div>
      ) : (
        <EmptyState icon={FolderKanban} title="هنوز پروژه‌ای منتشر نشده" hint="اولین پروژه‌ات را اضافه کن و شروع کن به ساختن" />
      )}
    </main>
  );
}
