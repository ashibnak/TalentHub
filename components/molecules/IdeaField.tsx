'use client';

import { useState } from 'react';
import { CharCounter } from '@/components/atoms/CharCounter';
import { inputClass, labelClass } from '@/lib/ui';

type Props = {
  name: string;
  label: string;
  /** One line on what a good answer looks like — the whole point of the field. */
  helper: string;
  placeholder?: string;
  min?: number;
  max: number;
  rows?: number;
  defaultValue?: string;
  error?: string | null;
  optional?: boolean;
};

/**
 * One labelled field of the idea form: Persian label, one line of helper text,
 * a live character counter, and inline error text (design system §5.2).
 *
 * Controlled purely to drive the counter — the value still submits by `name`,
 * so the server action reads it from FormData like every other form here.
 */
export function IdeaField({
  name,
  label,
  helper,
  placeholder,
  min,
  max,
  rows,
  defaultValue = '',
  error,
  optional = false,
}: Props) {
  const [value, setValue] = useState(defaultValue);
  const isTextarea = (rows ?? 0) > 1;

  const control = isTextarea ? (
    <textarea
      id={name}
      name={name}
      rows={rows}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder={placeholder}
      aria-invalid={!!error}
      aria-describedby={`${name}-helper`}
      className={`mt-1 w-full ${inputClass}`}
    />
  ) : (
    <input
      id={name}
      name={name}
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder={placeholder}
      aria-invalid={!!error}
      aria-describedby={`${name}-helper`}
      className={`mt-1 w-full ${inputClass}`}
    />
  );

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={name} className={labelClass}>
          {label}
          {optional && <span className="text-text-muted"> (اختیاری)</span>}
        </label>
        <CharCounter current={value.length} min={min} max={max} />
      </div>
      <p id={`${name}-helper`} className="mt-1 text-body-sm text-text-muted leading-relaxed">
        {helper}
      </p>
      {control}
      {error && <p className="mt-1 text-body-sm text-state-error">{error}</p>}
    </div>
  );
}
