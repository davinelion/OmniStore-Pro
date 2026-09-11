/**
 * Runtime validators. Every OmniSource response is parsed before use — a
 * malformed or hostile upstream degrades into `null`, never into a crash.
 */

import type { ZodType } from "zod";

/** Parse and return `null` instead of throwing when upstream lies. */
export function parseSafe<T>(schema: ZodType<T>, value: unknown): T | null {
  const result = schema.safeParse(value);
  return result.success ? result.data : null;
}

export function parseOrThrow<T>(schema: ZodType<T>, value: unknown): T {
  return schema.parse(value);
}
