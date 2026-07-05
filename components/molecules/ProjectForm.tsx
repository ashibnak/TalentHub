import Link from 'next/link';
import type { TaxonomySkill } from '@/lib/db/queries/taxonomy';
import type { ProjectStage } from '@/components/atoms/StageBadge';
import { SkillCheckboxes } from '@/components/molecules/SkillCheckboxes';
import { AiToolCheckboxes } from '@/components/molecules/AiToolCheckboxes';
import { inputClass, labelClass, btnPrimary, btnSecondary } from '@/lib/ui';

const STAGE_OPTIONS: { value: ProjectStage; label: string }[] = [
  { value: 'experiment', label: 'Experiment · آزمایش' },
  { value: 'weekend_hack', label: 'Weekend Hack · پروژه‌ی آخرهفته' },
  { value: 'building', label: 'Building · در حال ساخت' },
  { value: 'shipped', label: 'Shipped · منتشرشده' },
  { value: 'maintained', label: 'Maintained · در حال نگهداری' },
];

const ERROR_MESSAGES: Record<string, string> = {
  title: 'عنوان باید بین ۳ تا ۱۲۰ کاراکتر باشد.',
  description: 'توضیحات باید بین ۱۰ تا ۴۰۰۰ کاراکتر باشد.',
  stage: 'مرحله نامعتبر است.',
  github: 'لینک گیت‌هاب معتبر نیست (باید با http شروع شود).',
  demo: 'لینک دمو معتبر نیست (باید با http شروع شود).',
  confirm: 'برای ثبت، تأیید مالکیت پروژه الزامی است.',
  forbidden: 'اجازه‌ی ویرایش این پروژه را نداری.',
};

export type ProjectFormDefaults = {
  title: string;
  description: string;
  stage: ProjectStage;
  status: 'draft' | 'published';
  githubUrl: string | null;
  demoUrl: string | null;
  skillSlugs: string[];
  toolSlugs: string[];
};

export function ProjectForm({
  action,
  skills,
  projectId,
  defaults,
  submitLabel,
  error,
}: {
  action: (formData: FormData) => void | Promise<void>;
  skills: TaxonomySkill[];
  projectId?: string;
  defaults?: ProjectFormDefaults;
  submitLabel: string;
  error?: string;
}) {
  return (
    <form action={action} className="flex flex-col gap-4">
      {error && <p className="text-body-sm text-red-400">{ERROR_MESSAGES[error] ?? 'خطا در ذخیره‌ی پروژه.'}</p>}
      {projectId && <input type="hidden" name="projectId" value={projectId} />}

      <label className={labelClass}>
        عنوان پروژه
        <input name="title" required minLength={3} maxLength={120} defaultValue={defaults?.title} className={`mt-1 w-full ${inputClass}`} placeholder="نام پروژه" />
      </label>

      <label className={labelClass}>
        توضیحات
        <textarea name="description" required rows={5} defaultValue={defaults?.description} className={`mt-1 w-full ${inputClass}`} placeholder="پروژه چه می‌کند، چه مشکلی را حل می‌کند و چطور ساخته شده؟" />
      </label>

      <label className={labelClass}>
        مرحله
        <select name="stage" defaultValue={defaults?.stage ?? 'experiment'} className={`mt-1 w-full ${inputClass}`}>
          {STAGE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          لینک گیت‌هاب (اختیاری)
          <input name="githubUrl" type="url" dir="ltr" defaultValue={defaults?.githubUrl ?? ''} className={`mt-1 w-full ${inputClass}`} placeholder="https://github.com/…" />
        </label>
        <label className={labelClass}>
          لینک دمو (اختیاری)
          <input name="demoUrl" type="url" dir="ltr" defaultValue={defaults?.demoUrl ?? ''} className={`mt-1 w-full ${inputClass}`} placeholder="https://…" />
        </label>
      </div>

      <div>
        <div className={`mb-2 ${labelClass}`}>مهارت‌های به‌کاررفته</div>
        <SkillCheckboxes name="skills" skills={skills} selected={defaults?.skillSlugs ?? []} />
      </div>

      <div>
        <div className={`mb-2 ${labelClass}`}>ابزارهای AI</div>
        <AiToolCheckboxes name="tools" selected={defaults?.toolSlugs ?? []} />
      </div>

      <label className="flex items-start gap-2 text-body-sm text-text-tertiary">
        <input type="checkbox" name="confirmed" required defaultChecked={!!defaults} className="mt-1 shrink-0" />
        <span>تأیید می‌کنم این پروژه‌ی شخصی من است و مالکیت معنوی کسی را نقض نمی‌کند.</span>
      </label>

      <label className="flex items-center gap-2 text-body-sm text-text-tertiary">
        <input type="checkbox" name="publish" defaultChecked={defaults?.status === 'published'} className="shrink-0" />
        <span>همین حالا منتشر شود (در غیر این صورت پیش‌نویس می‌ماند).</span>
      </label>

      <div className="flex items-center gap-3">
        <button type="submit" className={btnPrimary}>
          {submitLabel}
        </button>
        <Link href="/settings" className={btnSecondary}>
          انصراف
        </Link>
      </div>
    </form>
  );
}
