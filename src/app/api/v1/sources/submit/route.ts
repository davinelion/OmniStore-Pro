/**
 * POST /api/v1/sources/submit  { url, name? }
 *
 * Forwards a "please index this source" request to an operator-configured
 * OmniSource intake endpoint. `OMNISOURCE_ADMIN_API_KEY` is read server-side
 * and is never exposed to the browser.
 *
 * When no intake endpoint is configured the route returns a prefilled GitHub
 * issue URL instead, so the flow still ends somewhere useful. It never claims
 * a submission was accepted when nothing received it.
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import { site } from "@/config/site";
import { parseSourceUrl } from "@/lib/sources";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  url: z.string().min(3).max(500),
  name: z.string().max(200).optional(),
});

/* ------------------------------------------------------------------ */
/* Coarse in-memory rate limit: 5 submissions per IP per 10 minutes.    */
/* Enough to stop casual abuse; a real deployment should use Redis.     */
/* ------------------------------------------------------------------ */

const WINDOW_MS = 10 * 60_000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((at) => now - at < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);

  // Opportunistic cleanup so the map cannot grow without bound.
  if (hits.size > 5_000) {
    for (const [entry, times] of hits) {
      if (times.every((at) => now - at >= WINDOW_MS)) hits.delete(entry);
    }
  }
  return false;
}

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}

export async function POST(request: Request) {
  if (rateLimited(clientKey(request))) {
    return NextResponse.json(
      { error: { code: "rate_limited", message: "Too many submissions. Try again later." } },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "bad_request", message: "`url` is required" } },
      { status: 400 },
    );
  }

  const source = parseSourceUrl(parsed.data.url);
  if (!source) {
    return NextResponse.json(
      {
        error: {
          code: "unrecognised",
          message: "That does not look like a repository or package URL we can index.",
        },
      },
      { status: 422 },
    );
  }

  const intake = process.env.OMNISOURCE_SUBMIT_URL?.trim();
  const apiKey = process.env.OMNISOURCE_ADMIN_API_KEY?.trim();

  if (intake && /^https:\/\//i.test(intake)) {
    try {
      const response = await fetch(intake, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(apiKey ? { "x-api-key": apiKey } : {}),
        },
        body: JSON.stringify({
          url: source.url,
          source: source.source,
          slug: source.slug,
          name: parsed.data.name ?? null,
          requestedFrom: "omnistore",
        }),
        signal: AbortSignal.timeout(8000),
      });

      return NextResponse.json({
        accepted: response.ok,
        forwarded: true,
        status: response.status,
      });
    } catch {
      return NextResponse.json(
        {
          accepted: false,
          forwarded: false,
          reason: "intake-unreachable",
          issueUrl: issueUrlFor(source.url),
        },
        { status: 502 },
      );
    }
  }

  // No intake configured — hand the user a prefilled issue instead.
  return NextResponse.json({
    accepted: false,
    forwarded: false,
    reason: "not-configured",
    issueUrl: issueUrlFor(source.url),
  });
}

/** Prefilled "Suggest an app" issue on the OmniStore repository. */
function issueUrlFor(url: string): string {
  const params = new URLSearchParams({ template: "app-submission.yml", repository: url });
  return `${site.repoUrl}/issues/new?${params.toString()}`;
}
