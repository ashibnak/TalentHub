import { reviewOrbitAction } from '@/lib/actions/orbit';
import { nextOrbitStage, ORBIT_STAGE_LABEL, type OrbitStage } from '@/lib/ideas/orbit';
import { btnPrimary, btnSecondary, inputClass, labelClass } from '@/lib/ui';

const SCORES: { name: string; label: string }[] = [
  { name: 'problem', label: 'مسئله چقدر مهم است؟' },
  { name: 'agentFit', label: 'چقدر به هوش مصنوعی می‌خورد؟' },
  { name: 'prototype', label: 'می‌شود نمونه‌اش را ساخت؟' },
  { name: 'security', label: 'داده امن می‌ماند؟' },
  { name: 'measurable', label: 'نتیجه را می‌شود سنجید؟' },
  { name: 'implement', label: 'در عمل شدنی است؟' },
];

/**
 * Admin controls on an idea that has entered Orbit. The evidence fields shown
 * depend on the gate the idea is about to leave.
 */
export function OrbitReviewForm({ ideaId, stage }: { ideaId: string; stage: OrbitStage }) {
  const upcoming = nextOrbitStage(stage);

  return (
    <form action={reviewOrbitAction} className="mt-6 rounded-xl border border-border-subtle bg-surface p-6 shadow-sm">
      <h2 className="text-h3 mb-1">بررسی ایده</h2>
      <p className="mb-4 text-body-sm text-text-tertiary">
        این ایده الان در مرحله‌ی {ORBIT_STAGE_LABEL[stage]} است.
        {upcoming ? ` مرحله‌ی بعد ${ORBIT_STAGE_LABEL[upcoming]} است.` : ' این آخرین مرحله است.'}
      </p>
      <input type="hidden" name="ideaId" value={ideaId} />
      {upcoming && <input type="hidden" name="to" value={upcoming} />}

      {stage === 'screening' && (
        <fieldset className="mb-4 grid grid-cols-2 gap-3">
          <legend className={`${labelClass} col-span-2`}>از ۱ تا ۵ امتیاز بده. ۵ یعنی این بخش قوی است.</legend>
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

      {stage === 'clinic' && (
        <fieldset className="mb-4 flex flex-col gap-3">
          <legend className={labelClass}>جلسه‌ی آماده‌سازی</legend>
          <label className="text-body-sm text-text-tertiary">
            زمان جلسه
            <input name="clinicAt" type="datetime-local" required className={`mt-1 w-full ${inputClass}`} />
          </label>
          <label className="text-body-sm text-text-tertiary">
            چه بازخوردی دادی؟
            <textarea name="clinicNote" required minLength={10} rows={3} className={`mt-1 w-full ${inputClass}`} />
          </label>
        </fieldset>
      )}

      {stage === 'pitch' && (
        <label className={`${labelClass} mb-4 block`}>
          لینک ارائه، حداکثر پنج اسلاید
          <input name="pitchUrl" type="url" required dir="ltr" placeholder="https://" className={`mt-1 w-full ${inputClass}`} />
        </label>
      )}

      {stage === 'demo' && (
        <fieldset className="mb-4 grid grid-cols-2 gap-3">
          <legend className={`${labelClass} col-span-2`}>نمایش کار را از ۱ تا ۵ بسنج</legend>
          {(
            [
              ['function', 'درست کار می‌کند؟'],
              ['value', 'به درد کار می‌خورد؟'],
              ['security', 'داده امن می‌ماند؟'],
              ['readiness', 'برای پایلوت آماده است؟'],
            ] as const
          ).map(([name, label]) => (
            <label key={name} className="text-body-sm text-text-tertiary">
              {label}
              <input name={`demo_${name}`} type="number" min={1} max={5} required className={`mt-1 w-full ${inputClass}`} />
            </label>
          ))}
        </fieldset>
      )}

      {(stage === 'demo' || stage === 'pilot') && (
        <fieldset className="mb-4 flex flex-col gap-3">
          <legend className={labelClass}>برنامه‌ی پایلوت</legend>
          {(
            [
              ['pilotGoal', 'هدف'],
              ['pilotScope', 'محدوده'],
              ['pilotUsers', 'چه کسانی استفاده می‌کنند؟'],
              ['pilotMetrics', 'با چه نشانه‌ای می‌سنجیم؟'],
              ['pilotRisks', 'چه چیزی ممکن است درست پیش نرود؟'],
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
              <option value="">هنوز تصمیم گرفته نشده</option>
              <option value="continue">ادامه می‌دهیم</option>
              <option value="stop">متوقف می‌کنیم</option>
            </select>
          </label>
        </fieldset>
      )}

      <label className={`${labelClass} mb-4 block`}>
        یادداشت برای نویسنده‌ی ایده
        <textarea name="note" required minLength={10} maxLength={1000} rows={3} className={`mt-1 w-full ${inputClass}`} />
      </label>

      <div className="flex flex-wrap gap-3">
        {upcoming && (
          <button type="submit" name="decision" value="advance" className={btnPrimary}>
            انتقال به {ORBIT_STAGE_LABEL[upcoming]}
          </button>
        )}
        <button type="submit" name="decision" value="needs_work" className={btnSecondary}>
          برگردان برای اصلاح
        </button>
        <button type="submit" name="decision" value="approve" className={btnSecondary}>
          تأیید
        </button>
        <button type="submit" name="decision" value="reject" className="text-body-sm text-text-muted hover:text-state-error">
          رد کردن
        </button>
      </div>
    </form>
  );
}
