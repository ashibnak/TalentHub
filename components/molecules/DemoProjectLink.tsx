import Link from 'next/link';
import { linkDemoProjectAction } from '@/lib/actions/orbit-team';
import { btnSecondary, labelClass } from '@/lib/ui';

export function DemoProjectLink({
  ideaId,
  current,
  candidates,
  canEdit,
}: {
  ideaId: string;
  current: { id: string; title: string } | null;
  candidates: { id: string; title: string; owner: string }[];
  canEdit: boolean;
}) {
  return (
    <section className="mt-6 rounded-xl border border-border-subtle bg-surface p-6 shadow-sm">
      <h2 className="text-body-sm text-text-tertiary mb-2">پروژه‌ی مرتبط</h2>
      {current ? (
        <p className="text-body text-fg">
          <Link href={`/projects/${current.id}`} className="transition-colors hover:text-info">
            {current.title}
          </Link>
        </p>
      ) : (
        <p className="text-body-sm text-text-muted">برای نمایش این ایده، یکی از پروژه‌های منتشرشده‌ی خودت یا تیم را انتخاب کن.</p>
      )}
      {canEdit && (
        <form action={linkDemoProjectAction} className="mt-4 flex flex-wrap items-end gap-3">
          <label className={labelClass}>
            پروژه‌ی منتشرشده
            <select name="projectId" defaultValue={current?.id ?? ''} className="mt-1 w-full bg-canvas border border-border rounded-md px-3 py-2 text-body text-fg">
              <option value="">انتخاب نشده</option>
              {candidates.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title} — {project.owner}
                </option>
              ))}
            </select>
          </label>
          <input type="hidden" name="ideaId" value={ideaId} />
          <button type="submit" className={btnSecondary}>
            ذخیره
          </button>
        </form>
      )}
    </section>
  );
}
