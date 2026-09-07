import { NextResponse } from "next/server";
import { z } from "zod";

/**
 * Shared BFF response helpers.
 *
 * Cache lifetimes follow the freshness profile of each resource: taxonomy is
 * long-lived, search is short-lived, mutations are never cached.
 */

export function json<T>(data: T, init?: { cacheSeconds?: number; status?: number }) {
  const response = NextResponse.json(data as object, { status: init?.status ?? 200 });
  const seconds = init?.cacheSeconds ?? 0;
  if (seconds > 0) {
    // Shared caches may serve it; browsers revalidate so a refresh sees new data.
    response.headers.set("cache-control", `public, max-age=0, s-maxage=${seconds}, stale-while-revalidate=${seconds * 2}`);
  } else {
    response.headers.set("cache-control", "no-store");
  }
  response.headers.set("x-content-type-options", "nosniff");
  return response;
}

export function apiError(code: string, status = 500, message?: string) {
  return json(
    { error: { code, message: message ?? "Request could not be completed." } },
    { status },
  );
}

export function notFound(message = "Not found") {
  return apiError("not_found", 404, message);
}

export function badRequest(issues?: unknown) {
  return json({ error: { code: "invalid_request", message: "Invalid request.", issues } }, { status: 400 });
}

/** Parses a request body against a schema, returning `null` on failure. */
export async function parseBody<T>(request: Request, schema: z.ZodType<T>): Promise<T | null> {
  try {
    const body: unknown = await request.json();
    const parsed = schema.safeParse(body);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Rate limiting for write endpoints: fixed window, in-process. */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}
