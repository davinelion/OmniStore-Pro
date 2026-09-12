import { NextResponse, type NextRequest } from "next/server";

/** Middleware runs in Vercel's edge runtime by default. */

/** Lightweight edge guard for public mutation endpoints. Use a durable WAF or
 * Vercel Firewall for multi-region enforcement; this protects the hot path
 * before a request reaches a serverless function. */
const buckets = new Map<string, { count: number; reset: number }>();
const WINDOW_MS = 60_000;
const LIMIT = 30;

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const protectedMutation = request.method !== "GET" && (
    path === "/api/v1/events" ||
    path === "/api/v1/sources/submit"
  );
  if (!protectedMutation) return NextResponse.next();

  const userAgent = request.headers.get("user-agent") ?? "";
  if (/curl|python-requests|scrapy/i.test(userAgent) && !request.headers.get("x-omnisource-signature")) {
    return NextResponse.json({ error: { code: "bot_blocked", message: "Automated submissions are not accepted." } }, { status: 403 });
  }

  const key = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "edge-client";
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.reset <= now) buckets.set(key, { count: 1, reset: now + WINDOW_MS });
  else if (bucket.count >= LIMIT) return NextResponse.json({ error: { code: "rate_limited", message: "Too many requests. Try again shortly." } }, { status: 429, headers: { "retry-after": String(Math.ceil((bucket.reset - now) / 1000)) } });
  else bucket.count += 1;

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/v1/events", "/api/v1/sources/submit"],
};
