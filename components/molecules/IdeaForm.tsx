'use client';

import { useActionState } from 'react';
import { IdeaField } from '@/components/molecules/IdeaField';
import { inputClass, labelClass, btnPrimary } from '@/lib/ui';
import { IDEA_LIMITS, type IdeaFieldErrors, type IdeaFormValues } from '@/lib/ideas/rules';
import { toFaDigits } from '@/lib/format';
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
  required: () => 'این قسمت را خالی نگذار.',
  too_short: (l) => `کمی بیشتر توضیح بده. حداقل ${toFaDigits(l.min)} کاراکتر.`,
  too_long: (l) => `کمی خلاصه‌تر بنویس. حداکثر ${toFaDigits(l.max)} کاراکتر.`,
  invalid: () => 'این انتخاب درست نیست. یکی دیگر را انتخاب کن.',
};

// Form-level codes (business rejections), shown above the fields.
const FORM_MESSAGE: Record<string, string> = {
  not_found: 'این ایده را پیدا نکردیم. شاید حذف شده باشد.',
  not_owner: 'فقط کسی که ایده را نوشته می‌تواند آن را عوض کند.',
  locked: 'روی این ایده تصمیم نهایی گرفته شده و دیگر قابل ویرایش نیست.',
  internal: 'ذخیره نشد. لطفاً یک بار دیگر امتحان کن.',
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
 * The original fields stay, plus the four Orbit signal questions screening
 * needs. Feasibility and the challenge stay optional. This feature exists for
 * people who don't write code, so each new question is one short answer.
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
        helper="یک جمله‌ی روشن که بگوید دنبال بهتر کردن چه کاری هستی."
        placeholder="مثلاً کوتاه کردن زمان تأیید مرخصی"
        max={IDEA_LIMITS.title.max}
        defaultValue={value('title')}
        error={fieldError(state.errors, 'title')}
      />

      <IdeaField
        name="problemStatement"
        label="مسئله چیست؟"
        helper="از یک موقعیت واقعی در کارت بگو. چه کسی درگیر است و چرا این کار وقت یا انرژی می‌گیرد."
        placeholder="هر درخواست مرخصی از سه نفر امضا می‌گیرد و معمولاً دو روز طول می‌کشد…"
        rows={6}
        min={IDEA_LIMITS.problemStatement.min}
        max={IDEA_LIMITS.problemStatement.max}
        defaultValue={value('problemStatement')}
        error={fieldError(state.errors, 'problemStatement')}
      />

      <IdeaField
        name="proposedSolution"
        label="راه‌حل پیشنهادی"
        helper="لازم نیست فنی باشد. بگو اگر این ساخته شود، کار آن آدم‌ها چه فرقی می‌کند."
        placeholder="دستیاری که درخواست را می‌خواند، قوانین مرخصی را چک می‌کند و…"
        rows={8}
        min={IDEA_LIMITS.proposedSolution.min}
        max={IDEA_LIMITS.proposedSolution.max}
        defaultValue={value('proposedSolution')}
        error={fieldError(state.errors, 'proposedSolution')}
      />

      <IdeaField
        name="targetUsers"
        label="به چه کسانی کمک می‌کند؟"
        helper="یک نقش یا تیم مشخص را نام ببر. نوشتن «همه» تصویر روشنی نمی‌دهد."
        placeholder="کارشناسان منابع انسانی و مدیران مستقیم"
        rows={2}
        max={IDEA_LIMITS.targetUsers.max}
        defaultValue={value('targetUsers')}
        error={fieldError(state.errors, 'targetUsers')}
      />

      <IdeaField
        name="successCriteria"
        label="از کجا می‌فهمیم جواب داده؟"
        helper="یک نشانه یا عدد که انتظار داری تغییر کند."
        placeholder="میانگین زمان تأیید مرخصی از دو روز به کمتر از چهار ساعت برسد."
        rows={3}
        max={IDEA_LIMITS.successCriteria.max}
        defaultValue={value('successCriteria')}
        error={fieldError(state.errors, 'successCriteria')}
      />

      <IdeaField
        name="currentWorkaround"
        label="الان این کار چطور انجام می‌شود؟"
        helper="حتی اگر امروز با ایمیل، اکسل یا پیگیری دستی انجام می‌شود، همان را بنویس."
        rows={3}
        min={IDEA_LIMITS.currentWorkaround.min}
        max={IDEA_LIMITS.currentWorkaround.max}
        defaultValue={value('currentWorkaround')}
        error={fieldError(state.errors, 'currentWorkaround')}
      />

      <IdeaField
        name="whyAgent"
        label="چرا هوش مصنوعی؟"
        helper="کدام بخش کار تکراری یا قاعده‌مند است و هوش مصنوعی واقعاً آن را سبک‌تر می‌کند؟"
        rows={3}
        min={IDEA_LIMITS.whyAgent.min}
        max={IDEA_LIMITS.whyAgent.max}
        defaultValue={value('whyAgent')}
        error={fieldError(state.errors, 'whyAgent')}
      />

      <IdeaField
        name="dataNeeded"
        label="چه اطلاعات یا دسترسی‌ای لازم است؟"
        helper="نام سامانه یا داده را بنویس. اگر هنوز دسترسی نداری، همان را صادقانه بگو."
        rows={2}
        min={IDEA_LIMITS.dataNeeded.min}
        max={IDEA_LIMITS.dataNeeded.max}
        defaultValue={value('dataNeeded')}
        error={fieldError(state.errors, 'dataNeeded')}
      />

      <IdeaField
        name="teamCapability"
        label="خودت یا تیمت چقدر وقت دارید؟"
        helper="نقش‌ها و حدود ساعت هفته را بنویس. تنها بودن هم اشکالی ندارد."
        rows={2}
        min={IDEA_LIMITS.teamCapability.min}
        max={IDEA_LIMITS.teamCapability.max}
        defaultValue={value('teamCapability')}
        error={fieldError(state.errors, 'teamCapability')}
      />

      <IdeaField
        name="feasibilityNote"
        label="محدودیت یا ریسک"
        helper="اگر چیزی کار را سخت می‌کند این‌جا بگو. اگر نیست، خالی بگذار."
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
          اگر این ایده به یکی از چالش‌های سازمان وصل است، همان را انتخاب کن.
        </p>
        <select
          id="challengeId"
          name="challengeId"
          defaultValue={value('challengeId')}
          aria-invalid={!!state.errors?.challengeId}
          className={`mt-1 w-full ${inputClass}`}
        >
          <option value="">به چالش خاصی وصل نیست</option>
          {challenges.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        {state.errors?.challengeId && <p className="mt-1 text-body-sm text-state-error">این چالش را پیدا نکردیم. یکی دیگر را انتخاب کن.</p>}
      </div>

      <div>
        <label htmlFor="ipTerms" className={labelClass}>
          مالکیت ایده
        </label>
        <p className="mt-1 text-body-sm text-text-muted leading-relaxed">
          ممکن است بعداً کسی غیر از تو این ایده را بسازد. همین حالا بگو مالکیت با کیست.
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
        <p className="text-body-sm text-text-muted">اول پیش‌نویس ذخیره می‌شود. ثبت برای بررسی، قدم جداگانه‌ای است.</p>
      </div>
    </form>
  );
}
