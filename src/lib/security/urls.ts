/**
 * Untrusted-input hardening.
 *
 * Everything that arrives from OmniSource (or a URL typed by a user) passes
 * through here before it is rendered as a link, an image or markdown.
 */

const ALLOWED_PROTOCOLS = new Set(["https:"]);
/** Local development only — never enabled in a production build. */
const DEV_HOSTS = new Set(["localhost", "127.0.0.1"]);

function parse(raw: string): URL | null {
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

/**
 * Only https is allowed out of the app. `javascript:`, `data:`, `file:`,
 * `blob:` and every other scheme are rejected.
 */
export function isSafeUrl(raw?: string | null): boolean {
  if (!raw) return false;
  const url = parse(raw.trim());
  if (!url) return false;
  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    // http is tolerated only against a local dev server.
    if (url.protocol === "http:" && process.env.NODE_ENV !== "production" && DEV_HOSTS.has(url.hostname)) {
      return true;
    }
    return false;
  }
  return true;
}

/** Returns the URL when it is safe to render as a link, otherwise undefined. */
export function safeHref(raw?: string | null): string | undefined {
  if (!isSafeUrl(raw)) return undefined;
  return raw as string;
}

/** Safe `href` with a guaranteed fallback for broken upstream links. */
export function safeHrefOr(raw: string | null | undefined, fallback: string): string {
  return safeHref(raw) ?? fallback;
}

export function safeImageUrl(raw?: string | null): string | undefined {
  return safeHref(raw);
}

/**
 * External link attributes. `noopener` is mandatory; `noreferrer` protects the
 * user's browsing context from upstream referrer tracking.
 */
export const EXTERNAL_LINK_PROPS = {
  target: "_blank",
  rel: "noopener noreferrer external",
} as const;

/**
 * Guards against open redirects: only same-origin relative paths are allowed
 * for `?next=` style parameters.
 */
export function safeInternalPath(raw: string | null | undefined, fallback = "/"): string {
  if (!raw) return fallback;
  if (!raw.startsWith("/")) return fallback;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  if (/[\x00-\x1f]/.test(raw)) return fallback;
  try {
    // Resolve against the current origin and confirm it stayed local.
    const url = new URL(raw, "https://omnistore.local");
    if (!url.pathname.startsWith("/")) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

/* ------------------------------------------------------------------ */
/* Markdown                                                            */
/* ------------------------------------------------------------------ */

const DANGEROUS_TAG =
  /<\s*\/?\s*(script|iframe|object|embed|link|meta|base|form|svg|math|style|audio|video|source|track|frame|frameset|applet|template|slot|portal)\b[^>]*>/gi;

/**
 * Reduces upstream release notes to inert text.
 *
 * We never inject upstream HTML into the page. Tags are stripped rather than
 * escaped-so-they-render, because release notes are prose, not documents.
 */
export function sanitizeMarkdown(input?: string | null): string {
  if (!input) return "";

  let text = input
    // Remove fenced code blocks but keep their content as preformatted text.
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```/g, "").trim())
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(DANGEROUS_TAG, " ")
    .replace(/<\s*\/?\s*[a-z][^>]*>/gi, " ")
    // Neutralise any scheme that could execute or exfiltrate.
    .replace(/(javascript|vbscript|file|data|blob|about)\s*:/gi, "")
    .replace(/&(?:#\d+|#x[0-9a-f]+|nbsp|amp|lt|gt|quot|#39);/gi, (entity) => {
      const map: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " " };
      return map[entity.toLowerCase()] ?? " ";
    })
    .replace(/on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/expression\s*\(/gi, "")
    .replace(/url\s*\(\s*["']?[^)]*\)/gi, "")
    .replace(/@import\b/gi, "");

  // Convert the small markdown subset upstream projects actually use.
  text = text
    .replace(/^\s{0,3}#{1,6}\s*(.+)$/gm, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s{0,3}([-*+]|\d+\.)\s+/gm, "• ")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text;
}

/** Short, single-line preview used in cards and metadata. */
export function plainText(input: string | null | undefined, max = 180): string {
  const clean = sanitizeMarkdown(input).replace(/\s+/g, " ").trim();
  if (!clean) return "";
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

/** Strips control characters that could break rendering or spoof UI. */
export function sanitizeText(input: string | null | undefined): string {
  if (!input) return "";
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\u0000-\u001f\u007f-\u009f]/g, " ").replace(/\s+/g, " ").trim();
}
