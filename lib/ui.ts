// Shared Tailwind class strings for forms/buttons, so the several self-service
// pages stay visually identical to the existing admin/home/settings forms.
// (Plain strings — not React components — mirroring the per-page `inputClass`
// consts already used across the app, deduplicated in one place.)

export const inputClass =
  'bg-canvas border border-border focus:border-border-focus focus:bg-info-subtle rounded-md px-3 py-2 text-body text-fg placeholder:text-text-muted outline-none transition-colors';

export const labelClass = 'block text-body-sm text-text-tertiary';

export const btnPrimary =
  'rounded-md bg-action px-4 py-2 text-body font-medium text-on-action shadow-sm transition-colors hover:bg-action-hover';

export const btnSecondary =
  'rounded-md border border-border bg-surface px-4 py-2 text-body font-medium text-fg shadow-sm transition-colors hover:bg-surface-elevated';
