'use client';

import { useState, useActionState } from 'react';
import { Plus } from 'lucide-react';
import { submitProjectToProblemAction, type SubmitState } from '@/lib/actions/submissions';
import { IpTermsNotice } from '@/components/molecules/IpTermsNotice';
import { inputClass, labelClass, btnPrimary, btnSecondary } from '@/lib/ui';
import type { IpTerms } from '@/lib/submissions/rules';
import type { SubmittableProject } from '@/lib/db/queries/submissions';

type Props = {
  slug: string;
  problemId: string;
  projects: SubmittableProject[];
  ipTerms: IpTerms;
  ipTermsNote: string | null;
};

// Field-level validation codes → Persian helper text (rendered below the field).
const FIELD_MESSAGES: Record<string, string> = {
  too_short: 'توضیح راه‌حل باید دست‌کم ۱۲۰ کاراکتر باشد.',
  too_long: 'توضیح راه‌حل نباید از ۴۰۰۰ کاراکتر بیشتر باشد.',
  project_invalid: 'یک پروژه‌ی معتبر انتخاب کن.',
  ip_terms: 'برای ثبت، پذیرش شرایط مالکیت فکری الزامی است.',
};

// Codes not tied to one field (business rejections / internal) → top-of-form.
const FORM_MESSAGES: Record<string, string> = {
  not_owner: 'این پروژه متعلق به تو نیست.',
  not_published: 'فقط پروژه‌های منتشرشده را می‌توان ثبت کرد.',
  project_not_found: 'پروژه پیدا نشد.',
  problem_not_found: 'مسئله پیدا نشد.',
  problem_not_active: 'این مسئله فعلاً پذیرای پروژه نیست.',
  duplicate: 'این پروژه قبلاً روی این مسئله ثبت شده است.',
  internal: 'مشکلی پیش آمد. دوباره تلاش کن.',
  invalid: 'ورودی نامعتبر است.',
};

const errorTextClass = 'mt-1 text-body-sm text-state-error';

// The "submit a project to this problem" affordance: a button that reveals the
// form. Rendered only for signed-in users who have ≥1 published project (the
// parent page gates that), so the form always has at least one option.
export function SubmitProjectPanel({ slug, problemId, projects, ipTerms, ipTermsNote }: Props) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<SubmitState, FormData>(submitProjectToProblemAction, {});

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={`inline-flex items-center gap-1 ${btnPrimary}`}>
        <Plus size={16} strokeWidth={1.5} />
        ثبت پروژه روی این مسئله
      </button>
    );
  }

  const { error, values } = state;
  const solutionError = error === 'too_short' || error === 'too_long' ? FIELD_MESSAGES[error] : null;
  const projectError = error === 'project_invalid' ? FIELD_MESSAGES[error] : null;
  const ipError = error === 'ip_terms' ? FIELD_MESSAGES[error] : null;
  const formError = error && error in FORM_MESSAGES ? FORM_MESSAGES[error] : null;

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface p-6 shadow-sm">
      <h2 className="text-h3 text-fg">ثبت پروژه روی این مسئله</h2>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="problemId" value={problemId} />

      {formError && (
        <p role="alert" className="rounded-lg border border-border-subtle bg-canvas px-4 py-3 text-body-sm text-state-error">
          {formError}
        </p>
      )}

      <label className={labelClass}>
        پروژه
        {/* Repopulated from the returned values so a failed submit keeps the choice. */}
        <select
          name="projectId"
          defaultValue={values?.projectId ?? ''}
          aria-invalid={!!projectError}
          className={`mt-1 w-full ${inputClass}`}
        >
          <option value="" disabled>
            یک پروژه‌ی منتشرشده انتخاب کن
          </option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
        {projectError && <p className={errorTextClass}>{projectError}</p>}
      </label>

      <label className={labelClass}>
        توضیح راه‌حل
        <textarea
          name="solutionDescription"
          rows={7}
          maxLength={4000}
          defaultValue={values?.solutionDescription ?? ''}
          aria-invalid={!!solutionError}
          className={`mt-1 w-full ${inputClass}`}
          placeholder="توضیح بده: این پروژه کدام بخش از مسئله را حل می‌کند؟ رویکردت چه بود؟ چه محدودیت‌هایی دارد؟ (Markdown پشتیبانی می‌شود — حداقل ۱۲۰ کاراکتر)"
        />
        {solutionError && <p className={errorTextClass}>{solutionError}</p>}
      </label>

      <IpTermsNotice ipTerms={ipTerms} ipTermsNote={ipTermsNote} />

      <div>
        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            name="ipTermsAccepted"
            defaultChecked={values?.ipTermsAccepted ?? false}
            aria-invalid={!!ipError}
            className="mt-1 shrink-0"
          />
          <span className="text-body-sm text-fg leading-relaxed">شرایط مالکیت فکری بالا را خوانده‌ام و می‌پذیرم.</span>
        </label>
        {ipError && <p className={errorTextClass}>{ipError}</p>}
      </div>

      <div className="flex items-center gap-2">
        <button type="submit" disabled={pending} className={`${btnPrimary} disabled:opacity-40`}>
          {pending ? 'در حال ارسال…' : 'ارسال'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={btnSecondary}>
          انصراف
        </button>
      </div>
    </form>
  );
}
