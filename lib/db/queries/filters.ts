/** Escape LIKE/ILIKE wildcards so user search text is matched literally. */
export const escapeLike = (s: string): string => s.replace(/[\\%_]/g, '\\$&');

/** Normalize a Next.js searchParams value (string | string[] | undefined) to a string[]. */
export function toArray(value: string | string[] | undefined): string[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}
