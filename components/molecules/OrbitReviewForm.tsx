import { reviewOrbitAction } from '@/lib/actions/orbit';
import { nextOrbitStage, ORBIT_STAGE_LABEL, type OrbitStage } from '@/lib/ideas/orbit';
import { btnPrimary, btnSecondary, inputClass, labelClass } from '@/lib/ui';

const SCORES: { name: string; label: string }[] = [
  { name: 'problem', label: 'اهمیت مسئله' },
  { name: 'agentFit', label: 'تناسب با عامل هوش مصنوعی' },
  { name: 'prototype', label: 'امکان ساخت نمونه' },
  { name: 'security', label: 'امنیت داده' },
  { name: 'measurable', label: 'قابل سنجش بودن' },
  { name: 'implement', label: 'امکان پیاده‌سازی' },
];

/**
 * Admin controls on an idea that has entered Orbit. The evidence fields shown
 * depend on the gate the idea is about to leave.
 */
export function OrbitReviewForm({ ideaId, stage }: { ideaId: string; stage: OrbitStage }) {
  const upcoming = nextOrbitStage(stage);

  return (
    <form action={reviewOrbitAction} className="mt-6 rounded-xl border border-border-subtle bg-surface p-6 shadow-sm">
      <h2 className="text-h3 mb-1">بررسی Orbit</h2>
      <p className="mb-4 text-body-sm text-text-tertiary">
        مرحله‌ی فعلی: {ORBIT_STAGE_LABEL[stage]}
        {upcoming ? ` · مرحله‌ی بعد: ${ORBIT_STAGE_LABEL[upcoming]}` : ' · این آخرین مرحله است.'}
      </p>
      <input type="hidden" name="ideaId" value={ideaId} />
      {upcoming && <input type="hidden" name="to" value={upcoming} />}

      {stage === 'screening' && (
        <fieldset className="mb-4 grid grid-cols-2 gap-3">
          <legend className={`${labelClass} col-span-2`}>امتیاز ۱ تا ۵</legend>
          {SCORES.map((score) => (
            <label key={score.name} className="text-body-sm text-text-tertiary">
              {score.label}
              <input
                name={`score_${score.name}`}
                type="number"
                min={1}
                max={5}
                required
                className={`mt-1 w-full ${inputClass}`}
              />
            </label>
          ))}
        </fieldset>
      )}

      {stage === 'pitch' && (
        <label className={`${labelClass} mb-4 block`}>
          لینک ارائه‌ی پنج‌اسلایدی
          <input name="pitchUrl" type="url" required dir="ltr" placeholder="https://" className={`mt-1 w-full ${inputClass}`} />
        </label>
      )}

      {(stage === 'demo' || stage === 'pilot') && (
        <fieldset className="mb-4 flex flex-col gap-3">
          <legend className={labelClass}>منشور پایلوت</legend>
          {(
            [
              ['pilotGoal', 'هدف'],
              ['pilotScope', 'محدوده'],
              ['pilotUsers', 'کاربران'],
              ['pilotMetrics', 'شاخص‌ها'],
              ['pilotRisks', 'ریسک‌ها'],
            ] as const
          ).map(([name, label]) => (
            <label key={name} className="text-body-sm text-text-tertiary">
              {label}
              <textarea name={name} required minLength={10} rows={2} className={`mt-1 w-full ${inputClass}`} />
            </label>
          ))}
          <label className="text-body-sm text-text-tertiary">
            ادامه یا توقف
            <select name="pilotDecision" className={`mt-1 w-full ${inputClass}`} defaultValue="">
              <option value="">انتخاب نشده</option>
              <option value="continue">ادامه</option>
              <option value="stop">توقف</option>
            </select>
          </label>
        </fieldset>
      )}

      <label className={`${labelClass} mb-4 block`}>
        یادداشت برای صاحب ایده
        <textarea name="note" required minLength={10} maxLength={1000} rows={3} className={`mt-1 w-full ${inputClass}`} />
      </label>

      <div className="flex flex-wrap gap-3">
        {upcoming && (
          <button type="submit" name="decision" value="advance" className={btnPrimary}>
            رفتن به {ORBIT_STAGE_LABEL[upcoming]}
          </button>
        )}
        <button type="submit" name="decision" value="needs_work" className={btnSecondary}>
          بازگرداندن برای اصلاح
        </button>
        <button type="submit" name="decision" value="approve" className={btnSecondary}>
          تأیید
        </button>
        <button type="submit" name="decision" value="reject" className="text-body-sm text-text-muted hover:text-state-error">
          رد
        </button>
      </div>
    </form>
  );
}
