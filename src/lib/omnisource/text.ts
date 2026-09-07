/**
 * Upstream text hygiene.
 *
 * GitHub hands us READMEs and release notes written for a browser: HTML
 * entities, emoji shortcodes, badges, shields and tables. None of that belongs
 * in a store listing, and any of it can be a rendering hazard. These helpers
 * are used by the ingest pipeline and by `scripts/clean-feed.ts`, so existing
 * feeds can be repaired without re-fetching upstream.
 */

const NAMED_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&nbsp;": " ",
  "&hellip;": "…",
  "&mdash;": "—",
  "&ndash;": "–",
  "&rsquo;": "’",
  "&lsquo;": "‘",
  "&ldquo;": "“",
  "&rdquo;": "”",
  "&trade;": "™",
  "&copy;": "©",
  "&reg;": "®",
};

/** Decodes numeric and named HTML entities into plain characters. */
export function decodeEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => safeCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => safeCodePoint(Number.parseInt(dec, 10)))
    .replace(/&[a-z][a-z0-9]{1,31};/gi, (entity) => NAMED_ENTITIES[entity.toLowerCase()] ?? entity);
}

function safeCodePoint(code: number): string {
  if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return "";
  // Skip control characters and surrogates.
  if (code < 0x20 || (code >= 0xd800 && code <= 0xdfff)) return "";
  try {
    return String.fromCodePoint(code);
  } catch {
    return "";
  }
}

/**
 * Removes GitHub emoji shortcodes (`:cherry_blossom:`, `:+1:`) that upstream
 * projects sprinkle through descriptions and release notes.
 */
export function stripEmojiShortcodes(input: string): string {
  return input.replace(/:\+1:|:-1:|:[a-z0-9_+-]{1,40}:/gi, " ").replace(/[ \t]{2,}/g, " ");
}

/** Strips control characters that would corrupt rendering. */
export function stripControlCharacters(input: string): string {
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g, " ");
}

/** Collapses whitespace inside a single line. */
export function collapseSpaces(input: string): string {
  return input.replace(/[ \t]{2,}/g, " ").trim();
}

/**
 * Light-touch cleaning for short upstream fields (summaries, feature bullets).
 *
 * Keeps the sentence intact; only removes markup residue that would otherwise
 * be shown to users verbatim.
 */
export function tidyText(input: string | null | undefined): string | null {
  if (!input) return null;
  const cleaned = collapseSpaces(
    stripEmojiShortcodes(stripControlCharacters(decodeEntities(input)))
      .replace(/<[^>]+>/g, " ")
      .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/[`*_~]/g, "")
      .replace(/\s+/g, " "),
  );
  return cleaned.length > 0 ? cleaned : null;
}
