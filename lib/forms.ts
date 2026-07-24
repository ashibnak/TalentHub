import type { z } from 'zod';

/**
 * Map a Zod validation failure to a single legacy error CODE, preserving the
 * "first failing field wins" order the hand-rolled guards used. `fieldToCode` is
 * an ordered list of [schemaField, errorCode]; the first field (in that order)
 * that has an issue decides the code.
 */
export function firstErrorCode(error: z.ZodError, fieldToCode: readonly (readonly [string, string])[]): string {
  const failed = new Set(error.issues.map((i) => String(i.path[0])));
  const hit = fieldToCode.find(([field]) => failed.has(field));
  return hit ? hit[1] : fieldToCode[0][1];
}
