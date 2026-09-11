import { NextResponse } from "next/server";
import { OmniSourceError } from "./client";

/**
 * Shared helpers for the /api/v1 proxy routes — OmniStore's stable REST
 * contract for native clients. Every route delegates to the OmniSource
 * client and maps failures to a consistent error envelope.
 */

export function ok<T>(data: T, revalidate = 300): NextResponse {
  return NextResponse.json(data, {
    headers: {
      "cache-control": `public, s-maxage=${revalidate}, stale-while-revalidate=${revalidate * 4}`,
    },
  });
}

export function fail(error: unknown): NextResponse {
  if (error instanceof OmniSourceError) {
    const status = error.status >= 400 && error.status <= 599 ? error.status : 502;
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: status === 0 ? 502 : status },
    );
  }
  return NextResponse.json(
    { error: { code: "proxy_error", message: "OmniSource request failed" } },
    { status: 502 },
  );
}

export function notFoundResponse(): NextResponse {
  return NextResponse.json(
    { error: { code: "not_found", message: "Not found in OmniSource" } },
    { status: 404 },
  );
}

/** Parse numeric search params with bounds. */
export function intParam(
  value: string | null,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export function boolParam(value: string | null): boolean | undefined {
  if (value === null) return undefined;
  return value === "true" || value === "1";
}
