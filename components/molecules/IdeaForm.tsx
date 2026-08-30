'use client';

import { useActionState } from 'react';
import { IdeaField } from '@/components/molecules/IdeaField';
import { inputClass, labelClass, btnPrimary } from '@/lib/ui';
import { IDEA_LIMITS, type IdeaFieldErrors, type IdeaFormValues } from '@/lib/ideas/rules';
import { IP_TERMS_LABEL_FA, IP_TERMS_VALUES } from '@/lib/submissions/rules';
import type { IdeaFormState } from '@/lib/actions/ideas';
import type { IdeaChallengeOption } from '@/lib/db/queries/ideas';

type Props = {
  action: (prev: IdeaFormState, formData: FormData) => Promise<IdeaFormState>;
  challenges: IdeaChallengeOption[];
  submitLabel: string;
  /** Present when editing an existing draft. */
  ideaId?: string;
  initialValues?: Partial<IdeaFormValues>;
};

// Per-field codes → Persian helper text. Limits are interpolated from the one
// source of truth so the copy can never drift from the schema.
const FIELD_MESSAGE: Record<string, (limit: { min: number; max: number }) => string> = {
  required: () => 'این فیلد الزامی است.',
  too_short: (l) => `دست‌کم ${l.min} کاراکتر بنویس.`,
  too_long: (l) => `حداکثر ${l.max} کاراکتر مجاز است.`,
  invalid: () => 'مقدار انتخاب‌شده معتبر نیست.',
};

// Form-level codes (business rejections), shown above the fields.
const FORM_MESSAGE: Record<string, string> = {
  not_found: 'این ایده پیدا نشد.',
  not_owner: 'این ایده متعلق به تو نیست.',
  locked: 'درباره‌ی این ایده تصمیم نهایی گرفته شده و دیگر قابل ویرایش نیست.',
  internal: 'مشکلی پیش آمد. دوباره تلاش کن.',
};

function fieldError(errors: IdeaFieldErrors | undefined, field: keyof typeof IDEA_LIMITS): string | null {
  const code = errors?.[field];
  if (!code) return null;
  const build = FIELD_MESSAGE[code];
  return build ? build(IDEA_LIMITS[field]) : null;
}

/**
 * The idea submission form, shared by /ideas/new and /ideas/[id]/edit.
 *
 * Five required fields and one optional — deliberately short. This feature
 * exists for people who don't write code, and a long form loses exactly them.
 *
 * NOTE: this form intentionally shows NO other ideas — no list, no sidebar, no
 * count. Exposure to many prior ideas narrows what a participant comes up with;
 * browsing belongs after submission, on /ideas, not during.
 */
export function IdeaForm({ action, challenges, submitLabel, ideaId, initialValues }: Props) {
  const [state, formAction, pending] = useActionState<IdeaFormState, FormData>(action, {});

  // Prefer what the failed attempt returned, then the saved draft, then empty.
  const value = (field: keyof IdeaFormValues) => state.values?.[field] ?? initialValues?.[field] ?? '';
  const formError = state.error ? (FORM_MESSAGE[state.error] ?? FORM_MESSAGE.internal) : null;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {ideaId && <input type="hidden" name="ideaId" value={ideaId} />}

      {formError && (
        <p role="alert" className="rounded-lg border border-border-error bg-action-subtle px-4 py-3 text-body-sm text-state-error">
          {formError}
        </p>
      )}

      <IdeaField
        name="title"
        label="عنوان ایده"
        helper="در یک جمله بگو چه چیزی را می‌خواهی بهتر کنی."
        placeholder="مثلاً: کوتاه کردن زمان پاسخ به درخواست‌های مرخصی"
        max={IDEA_LIMITS.title.max}
        defaultValue={value('title')}
        error={fieldError(state.errors, 'title')}
      />

      <IdeaField
        name="problemStatement"
        label="مسئله چیست؟"
        helper="مشکل امروز را با یک نمونه‌ی واقعی توضیح بده: چه اتفاقی می‌افتد، برای چه کسی، و چه هزینه‌ای دارد."
        placeholder="امروز هر درخواست مرخصی از سه نفر امضا می‌گیرد و به‌طور میانگین دو روز طول می‌کشد…"
        rows={6}
        min={IDEA_LIMITS.problemStatement.min}
        max={IDEA_LIMITS.problemStatement.max}
        defaultValue={value('problemStatement')}
        error={fieldError(state.errors, 'problemStatement')}
      />

      <IdeaField
        name="proposedSolution"
        label="راه‌حل پیشنهادی"
        helper="لازم نیست فنی باشد — بنویس اگر این ساخته شود، کار کاربر چطور عوض می‌شود."
        placeholder="یک دستیار که درخواست را می‌خواند، قوانین مرخصی را بررسی می‌کند و…"
        rows={8}
        min={IDEA_LIMITS.proposedSolution.min}
        max={IDEA_LIMITS.proposedSolution.max}
        defaultValue={value('proposedSolution')}
        error={fieldError(state.errors, 'proposedSolution')}
      />

      <IdeaField
        name="targetUsers"
        label="چه کسانی استفاده می‌کنند؟"
        helper="نقش یا تیم مشخصی را نام ببر، نه «همه‌ی کارمندان»."
        placeholder="کارشناسان منابع انسانی و مدیران مستقیم"
        rows={2}
        max={IDEA_LIMITS.targetUsers.max}
        defaultValue={value('targetUsers')}
        error={fieldError(state.errors, 'targetUsers')}
      />

      <IdeaField
        name="successCriteria"
        label="از کجا بفهمیم موفق شده؟"
        helper="یک نشانه‌ی قابل اندازه‌گیری بنویس — عددی که قرار است تغییر کند."
        placeholder="میانگین زمان تأیید مرخصی از دو روز به کمتر از چهار ساعت برسد."
        rows={3}
        max={IDEA_LIMITS.successCriteria.max}
        defaultValue={value('successCriteria')}
        error={fieldError(state.errors, 'successCriteria')}
      />

      <IdeaField
        name="feasibilityNote"
        label="نکته‌ی اجرایی"
        helper="اگر محدودیت، وابستگی یا ریسکی می‌شناسی اینجا بنویس؛ اگر نه، خالی بگذار."
        placeholder="به دسترسی خواندنی به سامانه‌ی حضور و غیاب نیاز دارد."
        rows={3}
        max={IDEA_LIMITS.feasibilityNote.max}
        defaultValue={value('feasibilityNote')}
        error={fieldError(state.errors, 'feasibilityNote')}
        optional
      />

      <div>
        <label htmlFor="challengeId" className={labelClass}>
          چالش مرتبط<span className="text-text-muted"> (اختیاری)</span>
        </label>
        <p className="mt-1 text-body-sm text-text-muted leading-relaxed">
          اگر ایده‌ات به یکی از چالش‌های سازمان مربوط است، انتخابش کن.
        </p>
        <select
          id="challengeId"
          name="challengeId"
          defaultValue={value('challengeId')}
          aria-invalid={!!state.errors?.challengeId}
          className={`mt-1 w-full ${inputClass}`}
        >
          <option value="">به چالش خاصی مربوط نیست</option>
          {challenges.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        {state.errors?.challengeId && <p className="mt-1 text-body-sm text-state-error">چالش انتخاب‌شده معتبر نیست.</p>}
      </div>

      <div>
        <label htmlFor="ipTerms" className={labelClass}>
          مالکیت فکری ایده
        </label>
        <p className="mt-1 text-body-sm text-text-muted leading-relaxed">
          ممکن است بعداً کسی دیگر این ایده را بسازد؛ همین حالا روشن کن مالکیت با چه کسی است.
        </p>
        <select id="ipTerms" name="ipTerms" defaultValue={value('ipTerms') || 'developer'} className={`mt-1 w-full ${inputClass}`}>
          {IP_TERMS_VALUES.map((t) => (
            <option key={t} value={t}>
              {IP_TERMS_LABEL_FA[t]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={`${btnPrimary} disabled:opacity-40`}>
          {pending ? 'در حال ذخیره…' : submitLabel}
        </button>
        <p className="text-body-sm text-text-muted">به‌صورت پیش‌نویس ذخیره می‌شود؛ ثبت نهایی مرحله‌ی جداگانه‌ای است.</p>
      </div>
    </form>
  );
}
