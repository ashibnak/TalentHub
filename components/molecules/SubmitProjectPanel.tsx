'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { submitProjectToProblemAction } from '@/lib/actions/submissions';
import { IpTermsNotice } from '@/components/molecules/IpTermsNotice';
import { inputClass, labelClass, btnPrimary, btnSecondary } from '@/lib/ui';
import { SOLUTION_MIN, type IpTerms } from '@/lib/submissions/rules';
import type { SubmittableProject } from '@/lib/db/queries/submissions';

type Props = {
  slug: string;
  problemId: string;
  projects: SubmittableProject[];
  ipTerms: IpTerms;
  ipTermsNote: string | null;
};

// The "submit a project to this problem" affordance: a button that reveals the
// form. Rendered only for signed-in users who have ≥1 published project (the
// parent page gates that), so the form always has at least one option.
export function SubmitProjectPanel({ slug, problemId, projects, ipTerms, ipTermsNote }: Props) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={`inline-flex items-center gap-1 ${btnPrimary}`}>
        <Plus size={16} strokeWidth={1.5} />
        ثبت پروژه روی این مسئله
      </button>
    );
  }

  return (
    <form action={submitProjectToProblemAction} className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface p-6 shadow-sm">
      <h2 className="text-h3 text-fg">ثبت پروژه روی این مسئله</h2>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="problemId" value={problemId} />

      <label className={labelClass}>
        پروژه
        <select name="projectId" required defaultValue="" className={`mt-1 w-full ${inputClass}`}>
          <option value="" disabled>
            یک پروژه‌ی منتشرشده انتخاب کن
          </option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </label>

      <label className={labelClass}>
        توضیح راه‌حل
        <textarea
          name="solutionDescription"
          rows={7}
          required
          minLength={SOLUTION_MIN}
          maxLength={4000}
          className={`mt-1 w-full ${inputClass}`}
          placeholder="توضیح بده: این پروژه کدام بخش از مسئله را حل می‌کند؟ رویکردت چه بود؟ چه محدودیت‌هایی دارد؟ (Markdown پشتیبانی می‌شود — حداقل ۱۲۰ کاراکتر)"
        />
      </label>

      <IpTermsNotice ipTerms={ipTerms} ipTermsNote={ipTermsNote} />

      <label className="flex cursor-pointer items-start gap-2">
        <input type="checkbox" name="ipTermsAccepted" required className="mt-1 shrink-0" />
        <span className="text-body-sm text-fg leading-relaxed">شرایط مالکیت فکری بالا را خوانده‌ام و می‌پذیرم.</span>
      </label>

      <div className="flex items-center gap-2">
        <button type="submit" className={btnPrimary}>
          ارسال
        </button>
        <button type="button" onClick={() => setOpen(false)} className={btnSecondary}>
          انصراف
        </button>
      </div>
    </form>
  );
}
