/**
 * Server-safe DOM id helper for section headings (aria-labelledby wiring).
 * Lives outside any "use client" module so Server Components can call it.
 */
export function sectionSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
