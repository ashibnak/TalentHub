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
