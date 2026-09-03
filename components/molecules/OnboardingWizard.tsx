'use client';

import { useState, useActionState } from 'react';
import type { KeyboardEvent } from 'react';
import { Wrench, BookOpen, Users, ArrowLeft } from 'lucide-react';
import { completeOnboardingAction, skipOnboardingAction, type OnboardingState } from '@/lib/actions/onboarding';
import type { TaxonomySkill } from '@/lib/db/queries/taxonomy';
import { SkillCheckboxes } from '@/components/molecules/SkillCheckboxes';
import { inputClass, labelClass, btnPrimary, btnSecondary } from '@/lib/ui';
import { toFaDigits } from '@/lib/format';

type Choice = 'builder' | 'domain_expert' | 'hybrid';
type Confidence = 'high' | 'medium' | 'low' | 'unknown';
type Destination = 'new_project' | 'challenges' | 'people' | 'home';
type Domain = { slug: string; name: string };

const CHOICE_OPTIONS: { value: Choice; label: string }[] = [
  { value: 'builder', label: 'بیشتر کد می‌نویسم (Cursor، Claude Code، Copilot، …)' },
  { value: 'domain_expert', label: 'متخصص حوزه‌ام (HR، مالی، بازاریابی، حقوقی…) و از AI استفاده می‌کنم' },
  { value: 'hybrid', label: 'هر دو' },
];

const CONFIDENCE_OPTIONS: { value: Confidence; label: string }[] = [
  { value: 'high', label: 'خیلی' },
  { value: 'medium', label: 'متوسط' },
  { value: 'low', label: 'کم' },
  { value: 'unknown', label: 'نمی‌دانم' },
];

const FORM_MESSAGES: Record<string, string> = {
  choice: 'مسیرت را در گام ۲ انتخاب کن.',
  role_title: 'عنوان شغلی خیلی طولانی است.',
  bio: 'بایو حداکثر ۶۰۰ کاراکتر است.',
  github: 'نام کاربری گیت‌هاب نامعتبر است.',
  domains_required: 'دست‌کم یک حوزه‌ی تخصصی انتخاب کن (گام ۳).',
  internal: 'خطای غیرمنتظره. دوباره تلاش کن.',
};

// Focus ring for card-style radios whose real input is visually hidden.
const cardFocusRing =
  'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-info has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-canvas';

export function OnboardingWizard({
  userName,
  domains,
  skills,
}: {
  userName: string;
  domains: Domain[];
  skills: TaxonomySkill[];
}) {
  const [step, setStep] = useState(1);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [selectedDomains, setSelectedDomains] = useState<Map<string, string>>(new Map()); // slug -> years ('' = unset)
  const [destination, setDestination] = useState<Destination>('home');
  const [state, formAction, pending] = useActionState<OnboardingState, FormData>(completeOnboardingAction, {});
  const formError = state.error ? (FORM_MESSAGES[state.error] ?? FORM_MESSAGES.internal) : undefined;

  const showDomains = choice === 'domain_expert' || choice === 'hybrid';
  const showGithub = choice === 'builder' || choice === 'hybrid';
  const showSkills = choice === 'hybrid';

  const toggleDomain = (slug: string) => {
    setSelectedDomains((prev) => {
      const next = new Map(prev);
      if (next.has(slug)) next.delete(slug);
      else next.set(slug, '');
      return next;
    });
  };
  const setYears = (slug: string, years: string) => {
    setSelectedDomains((prev) => new Map(prev).set(slug, years));
  };

  // Enter in a text field must not submit the wizard from an earlier step
  // (the final submit lives on step 5; textareas keep their newline behavior).
  const guardEnter = (e: KeyboardEvent<HTMLFormElement>) => {
    const tag = (e.target as HTMLElement).tagName;
    if (e.key === 'Enter' && step !== 5 && tag !== 'TEXTAREA' && tag !== 'BUTTON') e.preventDefault();
  };

  const stepTitle = ['خوش آمدی', 'مسیرت را انتخاب کن', 'پروفایلت', 'اولین قدم', 'یک سؤال آخر'][step - 1];
  // All five panels STAY MOUNTED (inputs must be in the DOM at submit time and
  // keep their values on back-navigation) — only visibility toggles.
  const panel = (n: number, cls = 'flex flex-col gap-6') => (step === n ? cls : 'hidden');

  // First-action cards per persona (plan Week 2 Prompt 5, Step 4).
  const destinationCards: { value: Destination; icon: typeof Wrench; title: string; desc: string }[] =
    choice === 'domain_expert'
      ? [
          { value: 'challenges', icon: BookOpen, title: 'برو به چالش‌های مرتبط', desc: 'مسئله‌های واقعی حوزه‌ات را ببین' },
          { value: 'people', icon: Users, title: 'نگاهی به سازمان', desc: 'ببین چه کسانی این‌جا هستند' },
        ]
      : choice === 'builder'
        ? [
            { value: 'new_project', icon: Wrench, title: 'ثبت اولین پروژه', desc: 'چیزی که ساخته‌ای را نشان بده' },
            { value: 'people', icon: Users, title: 'نگاهی به سازمان', desc: 'ببین چه کسانی این‌جا هستند' },
          ]
        : [
            { value: 'new_project', icon: Wrench, title: 'ثبت اولین پروژه', desc: 'چیزی که ساخته‌ای را نشان بده' },
            { value: 'challenges', icon: BookOpen, title: 'چالش‌های حوزه‌ات', desc: 'مسئله‌های واقعی را ببین' },
            { value: 'people', icon: Users, title: 'نگاهی به سازمان', desc: 'ببین چه کسانی این‌جا هستند' },
          ];

  return (
    <div className="mx-auto max-w-xl">
      {/* progress */}
      <div
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={5}
        aria-valuenow={step}
        aria-label={`گام ${toFaDigits(step)} از ۵`}
        className="mb-8 flex items-center gap-2"
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={`h-1 flex-1 rounded-full ${n <= step ? 'bg-action' : 'bg-fg/5'}`} aria-hidden />
        ))}
      </div>
      <h1 aria-live="polite" className="text-h2 mb-6">
        {stepTitle}
      </h1>

      <form action={formAction} onKeyDown={guardEnter} className="flex flex-col gap-6">
        {formError && (
          <p role="alert" className="rounded-lg border border-border-subtle bg-canvas px-4 py-3 text-body-sm text-state-error">
            {formError}
          </p>
        )}

        {/* Hidden mirrors of client-state values (display:none still submits). */}
        <div hidden>
          {choice && <input type="hidden" name="choice" value={choice} />}
          <input type="hidden" name="destination" value={destination} />
          {[...selectedDomains.entries()].map(([slug, years]) => (
            <span key={slug}>
              <input type="hidden" name="domains" value={slug} />
              {years !== '' && <input type="hidden" name={`years_${slug}`} value={years} />}
            </span>
          ))}
        </div>

        {/* ── Step 1: welcome ── */}
        <div className={panel(1)}>
          <p className="text-body-lg leading-relaxed text-fg/90">
            سلام {userName}، خوش اومدی. این‌جا شبکه‌ی استعدادهای AI سازمانه — آدم‌هایی که با AI کار
            می‌کنن، چیزهایی می‌سازن، یا توی حوزه‌ی خودشون از AI استفاده می‌کنن.
          </p>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setStep(2)} className={btnPrimary}>
              شروع کنیم
            </button>
            {step === 1 && (
              <button type="submit" formAction={skipOnboardingAction} className={btnSecondary}>
                بعداً
              </button>
            )}
          </div>
        </div>

        {/* ── Step 2: identity ── */}
        <div className={panel(2, 'flex flex-col gap-4')}>
          <div role="radiogroup" aria-label="مسیر" className="flex flex-col gap-3">
            {CHOICE_OPTIONS.map((o) => (
              <label
                key={o.value}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors ${
                  choice === o.value ? 'border-action bg-info-subtle' : 'border-border bg-surface hover:bg-surface-elevated'
                }`}
              >
                <input
                  type="radio"
                  name="choice_ui"
                  checked={choice === o.value}
                  onChange={() => setChoice(o.value)}
                  className="shrink-0"
                />
                <span className="text-body text-fg">{o.label}</span>
              </label>
            ))}
          </div>
          <p className="text-body-sm text-text-muted">این فقط برای شخصی‌سازی تجربه‌ست؛ بعداً قابل تغییره.</p>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setStep(3)} disabled={!choice} className={`${btnPrimary} disabled:opacity-40`}>
              ادامه
            </button>
            <button type="button" onClick={() => setStep(1)} className={btnSecondary}>
              بازگشت
            </button>
          </div>
        </div>

        {/* ── Step 3: branched profile form (inputs stay mounted after advancing) ── */}
        <div className={panel(3, 'flex flex-col gap-4')}>
          <label className={labelClass}>
            عنوان شغلی
            <input name="roleTitle" maxLength={120} className={`mt-1 w-full ${inputClass}`} placeholder="مثلاً کارشناس منابع انسانی" />
          </label>

          <label className={`${labelClass} ${showGithub ? '' : 'hidden'}`}>
            نام کاربری گیت‌هاب (اختیاری — پروژه‌هات بعداً verified می‌شه)
            <input name="githubUsername" dir="ltr" className={`mt-1 w-full ${inputClass}`} placeholder="octocat" />
          </label>

          <div className={showDomains ? '' : 'hidden'}>
            <div className={`mb-2 ${labelClass}`}>حوزه‌های تخصصی‌ات {choice === 'domain_expert' && '(دست‌کم یکی)'}</div>
            <div role="group" aria-label="حوزه‌های تخصصی" className="flex flex-col gap-2">
              {domains.map((d) => {
                const selected = selectedDomains.has(d.slug);
                return (
                  <div key={d.slug} className={`flex items-center gap-3 rounded-lg border p-3 ${selected ? 'border-action bg-info-subtle' : 'border-border bg-surface'}`}>
                    <label className="flex grow cursor-pointer items-center gap-2">
                      <input type="checkbox" checked={selected} onChange={() => toggleDomain(d.slug)} className="shrink-0" />
                      <span className="text-body-sm text-fg">{d.name}</span>
                    </label>
                    {selected && (
                      <label className="flex shrink-0 items-center gap-2 text-micro text-text-tertiary">
                        سال تجربه
                        <input
                          type="number"
                          min={0}
                          max={50}
                          step={1}
                          dir="ltr"
                          value={selectedDomains.get(d.slug) ?? ''}
                          onChange={(e) => setYears(d.slug, e.target.value)}
                          className={`w-16 ${inputClass} px-2 py-1`}
                          aria-label={`سال تجربه در ${d.name}`}
                        />
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className={showSkills ? '' : 'hidden'}>
            <div className={`mb-2 ${labelClass}`}>مهارت‌های فنی‌ات</div>
            <SkillCheckboxes name="skills" skills={skills} selected={[]} label="مهارت‌های فنی" />
          </div>

          <label className={labelClass}>
            بایو
            <textarea
              name="bio"
              rows={3}
              maxLength={600}
              className={`mt-1 w-full ${inputClass}`}
              placeholder={choice === 'builder' ? 'چی می‌سازی و با چه ابزارهایی؟' : 'مخصوصاً اگه از AI استفاده می‌کنی، چه‌جوری؟'}
            />
          </label>

          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setStep(4)} className={btnPrimary}>
              ادامه
            </button>
            <button type="button" onClick={() => setStep(2)} className={btnSecondary}>
              بازگشت
            </button>
          </div>
        </div>

        {/* ── Step 4: first action ── */}
        <div className={panel(4, 'flex flex-col gap-4')}>
          <div role="radiogroup" aria-label="اولین قدم" className="flex flex-col gap-3">
            {destinationCards.map((c) => (
              <label
                key={c.value}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors ${cardFocusRing} ${
                  destination === c.value ? 'border-action bg-info-subtle' : 'border-border bg-surface hover:bg-surface-elevated'
                }`}
              >
                <input type="radio" name="destination_ui" checked={destination === c.value} onChange={() => setDestination(c.value)} className="sr-only" />
                <c.icon size={20} strokeWidth={1.5} className="shrink-0 text-info" />
                <span className="min-w-0">
                  <span className="block text-body font-medium text-fg">{c.title}</span>
                  <span className="block text-body-sm text-text-tertiary">{c.desc}</span>
                </span>
                {destination === c.value && <ArrowLeft size={16} strokeWidth={1.5} className="ms-auto shrink-0 text-info" />}
              </label>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setStep(5)} className={btnPrimary}>
              ادامه
            </button>
            <button type="button" onClick={() => setStep(3)} className={btnSecondary}>
              بازگشت
            </button>
          </div>
        </div>

        {/* ── Step 5: confidence + submit ── */}
        <div className={panel(5, 'flex flex-col gap-4')}>
          <p className="text-body text-fg">چقدر مطمئنی این پلتفرم به کارت میاد؟</p>
          <div role="radiogroup" aria-label="اطمینان" className="flex flex-wrap gap-2">
            {CONFIDENCE_OPTIONS.map((o) => (
              <label key={o.value} className="cursor-pointer">
                <input type="radio" name="confidence" value={o.value} defaultChecked={o.value === 'unknown'} className="peer sr-only" />
                <span className="inline-block rounded-full border border-border px-4 py-2 text-body-sm text-text-tertiary transition-colors hover:bg-surface-elevated peer-checked:border-action peer-checked:bg-action peer-checked:text-on-action peer-focus-visible:ring-2 peer-focus-visible:ring-info peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-canvas">
                  {o.label}
                </span>
              </label>
            ))}
          </div>
          <p className="text-body-sm text-text-muted">صادق باش — این فقط برای بهترکردن پلتفرمه.</p>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={pending} className={`${btnPrimary} disabled:opacity-40`}>
              {pending ? 'در حال ذخیره…' : 'تمام — بریم!'}
            </button>
            <button type="button" onClick={() => setStep(4)} className={btnSecondary}>
              بازگشت
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
