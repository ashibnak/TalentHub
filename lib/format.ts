const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/**
 * Convert Western digits in a string/number to Persian numerals.
 * Use only in pure-Persian contexts (design system §7.4) — e.g. stat values,
 * "۱۰ سال". Don't use in dense mixed metadata rows.
 */
export function toFaDigits(value: string | number): string {
  return String(value).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}
