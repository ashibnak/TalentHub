import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/lib/auth/session';
import { getAllSkills } from '@/lib/db/queries/taxonomy';
import { createProjectAction } from '@/lib/actions/projects';
import { ProjectForm } from '@/components/molecules/ProjectForm';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'پروژه‌ی جدید — AIGraph' };

export default async function NewProjectPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireUser(); // auth gate — redirects to /login if signed out
  const sp = await searchParams;
  const skills = await getAllSkills();

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/settings" className="text-body-sm text-text-tertiary transition-colors hover:text-fg">
        → بازگشت به تنظیمات
      </Link>
      <h1 className="text-h1 mb-1 mt-3">پروژه‌ی جدید</h1>
      <p className="text-body-sm text-text-tertiary mb-8">پروژه‌ات را بساز؛ بعد می‌توانی منتشرش کنی تا در گراف دیده شود.</p>

      <section className="rounded-xl border border-border-subtle bg-surface p-6 shadow-sm">
        <ProjectForm action={createProjectAction} skills={skills} submitLabel="ایجاد پروژه" error={sp.error} />
      </section>
    </main>
  );
}
