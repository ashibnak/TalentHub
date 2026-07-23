import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireUser } from '@/lib/auth/session';
import { getAllSkills } from '@/lib/db/queries/taxonomy';
import { getMyProjectForEdit } from '@/lib/db/queries/me';
import { updateProjectAction, deleteProjectAction } from '@/lib/actions/projects';
import { ProjectForm } from '@/components/molecules/ProjectForm';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'ویرایش پروژه — AIGraph' };

export default async function EditProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const [project, skills, sp] = await Promise.all([getMyProjectForEdit(id, user.id), getAllSkills(), searchParams]);
  if (!project) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/settings" className="text-body-sm text-text-tertiary transition-colors hover:text-fg">
        → بازگشت به تنظیمات
      </Link>
      <h1 className="text-h1 mb-1 mt-3">ویرایش پروژه</h1>
      <p className="text-body-sm text-text-tertiary mb-8">{project.title}</p>

      <section className="rounded-xl border border-border-subtle bg-surface p-6 shadow-sm">
        <ProjectForm
          action={updateProjectAction}
          skills={skills}
          projectId={id}
          defaults={project}
          submitLabel="ذخیره تغییرات"
          error={sp.error}
        />
      </section>

      <section className="mt-8 rounded-xl border border-red-400/30 bg-surface p-6">
        <h2 className="text-h3 mb-1 text-red-400">حذف پروژه</h2>
        <p className="mb-4 text-body-sm text-text-tertiary">این کار قابل بازگشت نیست.</p>
        <form action={deleteProjectAction}>
          <input type="hidden" name="projectId" value={id} />
          <button
            type="submit"
            className="rounded-md border border-red-400/40 bg-surface px-4 py-2 text-body font-medium text-red-400 transition-colors hover:bg-red-400/10"
          >
            حذف پروژه
          </button>
        </form>
      </section>
    </main>
  );
}
