const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/**
 * Convert Western digits in a string/number to Persian numerals.
 * Use only in pure-Persian contexts (design system §7.4) — e.g. stat values,
 * "۱۰ سال". Don't use in dense mixed metadata rows.
 */
export function toFaDigits(value: string | number): string {
  return String(value).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

/**
 * Persian calendar date, Tehran time — for pure-Persian contexts (design system
 * §7.4). `Intl` already emits Persian digits for the fa-IR locale, so don't run
 * the result through `toFaDigits`.
 */
const FA_DATE = new Intl.DateTimeFormat('fa-IR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'Asia/Tehran',
});

const FA_DATE_TIME = new Intl.DateTimeFormat('fa-IR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Tehran',
});

export function formatFaDate(value: Date | string): string {
  return FA_DATE.format(typeof value === 'string' ? new Date(value) : value);
}

export function formatFaDateTime(value: Date | string): string {
  return FA_DATE_TIME.format(typeof value === 'string' ? new Date(value) : value);
}

/**
 * Relative Persian time for dense activity rows — «۲ روز پیش».
 *
 * Persian has no "ago" suffix that works with a bare number, so the unit word
 * is always spelled out; design system §7.5 puts relative timestamps in Persian.
 * Falls back to an absolute date past a month, where "۴۰ روز پیش" stops being
 * useful.
 */
export function formatFaRelative(value: Date | string, now: Date = new Date()): string {
  const then = typeof value === 'string' ? new Date(value) : value;
  const diffMs = now.getTime() - then.getTime();
  if (!Number.isFinite(diffMs)) return '';
  if (diffMs < 0) return 'همین حالا';

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'همین حالا';
  if (minutes < 60) return `${toFaDigits(minutes)} دقیقه پیش`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${toFaDigits(hours)} ساعت پیش`;

  const days = Math.floor(hours / 24);
  if (days === 1) return 'دیروز';
  if (days < 30) return `${toFaDigits(days)} روز پیش`;

  return formatFaDate(then);
}
