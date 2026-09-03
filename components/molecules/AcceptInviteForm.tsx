'use client';

import { useActionState } from 'react';
import { acceptInviteAction, type AcceptInviteState } from '@/lib/actions/invitations';
import { inputClass, labelClass, btnPrimary } from '@/lib/ui';

// Persian text for error CODES from the action/rules (codes never reach the UI raw).
const FIELD_MESSAGES: Record<string, { field: 'name' | 'username' | 'password' | 'passwordConfirm'; text: string }> = {
  name: { field: 'name', text: 'نام باید بین ۲ تا ۸۰ کاراکتر باشد.' },
  username: { field: 'username', text: 'نام کاربری: ۳ تا ۳۲ کاراکتر، فقط حروف کوچک انگلیسی (a-z)، ارقام 0-9 و خط تیره.' },
  password: { field: 'password', text: 'رمز عبور باید حداقل ۸ کاراکتر باشد.' },
  password_mismatch: { field: 'passwordConfirm', text: 'تکرار رمز عبور یکسان نیست.' },
  username_taken: { field: 'username', text: 'این نام کاربری قبلاً گرفته شده — یکی دیگر انتخاب کن.' },
};
const FORM_MESSAGES: Record<string, string> = {
  not_found: 'این لینک دعوت معتبر نیست.',
  used: 'این دعوت قبلاً استفاده شده است.',
  expired: 'این دعوت منقضی شده — از مدیر یک لینک تازه بگیر.',
  email_taken: 'برای این ایمیل قبلاً حسابی ساخته شده. از صفحه‌ی ورود وارد شو.',
  internal: 'خطای غیرمنتظره. دوباره تلاش کن.',
};

const errorTextClass = 'mt-1 text-body-sm text-state-error';

export function AcceptInviteForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<AcceptInviteState, FormData>(acceptInviteAction, {});
  const fieldError = state.error ? FIELD_MESSAGES[state.error] : undefined;
  const formError = state.error && !fieldError ? (FORM_MESSAGES[state.error] ?? FORM_MESSAGES.internal) : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {formError && (
        <p role="alert" className="rounded-lg border border-border-subtle bg-canvas px-4 py-3 text-body-sm text-state-error">
          {formError}
        </p>
      )}
      <input type="hidden" name="token" value={token} />

      <label className={labelClass}>
        نام و نام خانوادگی
        <input
          name="name"
          required
          minLength={2}
          maxLength={80}
          defaultValue={state.values?.name ?? ''}
          aria-invalid={fieldError?.field === 'name' || undefined}
          aria-describedby={fieldError?.field === 'name' ? 'err-name' : undefined}
          className={`mt-1 w-full ${inputClass}`}
          placeholder="مثلاً سارا کریمی"
        />
        {fieldError?.field === 'name' && <span id="err-name" role="alert" className={errorTextClass}>{fieldError.text}</span>}
      </label>

      <label className={labelClass}>
        نام کاربری (آدرس پروفایلت می‌شود)
        <input
          name="username"
          dir="ltr"
          required
          defaultValue={state.values?.username ?? ''}
          aria-invalid={fieldError?.field === 'username' || undefined}
          aria-describedby={fieldError?.field === 'username' ? 'err-username' : undefined}
          className={`mt-1 w-full ${inputClass}`}
          placeholder="sara-karimi"
        />
        {fieldError?.field === 'username' && <span id="err-username" role="alert" className={errorTextClass}>{fieldError.text}</span>}
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          رمز عبور
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            aria-invalid={fieldError?.field === 'password' || undefined}
          aria-describedby={fieldError?.field === 'password' ? 'err-password' : undefined}
            className={`mt-1 w-full ${inputClass}`}
          />
          {fieldError?.field === 'password' && <span id="err-password" role="alert" className={errorTextClass}>{fieldError.text}</span>}
        </label>
        <label className={labelClass}>
          تکرار رمز عبور
          <input
            name="passwordConfirm"
            type="password"
            required
            autoComplete="new-password"
            aria-invalid={fieldError?.field === 'passwordConfirm' || undefined}
          aria-describedby={fieldError?.field === 'passwordConfirm' ? 'err-passwordConfirm' : undefined}
            className={`mt-1 w-full ${inputClass}`}
          />
          {fieldError?.field === 'passwordConfirm' && <span id="err-passwordConfirm" role="alert" className={errorTextClass}>{fieldError.text}</span>}
        </label>
      </div>

      <button type="submit" disabled={pending} className={`self-start ${btnPrimary} disabled:opacity-40`}>
        {pending ? 'در حال ساخت حساب…' : 'ساخت حساب و شروع'}
      </button>
    </form>
  );
}
