const ALLOWED = new Set(["https:", "http:"]);

export function isSafeUrl(raw?: string | null): raw is string {
  if (!raw) return false;
  try {
    const u = new URL(raw);
    if (!ALLOWED.has(u.protocol)) return false;
    if (u.protocol === "http:" && u.hostname !== "localhost") return false;
    return true;
  } catch {
    return false;
  }
}

export function safeHref(raw?: string | null): string | undefined {
  return isSafeUrl(raw) ? raw : undefined;
}

export function sanitizeMarkdown(input?: string) {
  if (!input) return "";
  return input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "")
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, "")
    .replace(/<[^>]+>/g, "");
}
