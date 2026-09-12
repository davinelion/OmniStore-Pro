/**
 * GET /api/v1/sources/resolve?url=…
 *
 * Resolves a pasted repository / package URL to a catalog app, if OmniSource
 * has already indexed it. This is what makes the Track page behave like
 * Obtanium: paste any source URL and get back the app, its latest version and
 * its download assets — or an honest "not indexed yet" instead of a guess.
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import { getOmnisource } from "@/lib/omnisource";
import { fail, ok } from "@/lib/omnisource/http";
import { parseSourceUrl } from "@/lib/sources";

export const dynamic = "force-dynamic";

const QuerySchema = z.object({ url: z.string().min(3).max(500) });

/** Normalise a repository URL so cosmetic differences don't defeat matching. */
function normaliseRepo(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    const path = url.pathname.replace(/^\/+|\/+$/g, "").replace(/\.git$/, "").toLowerCase();
    return `${host}/${path}`;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("url") ?? "";
  const parsedQuery = QuerySchema.safeParse({ url: raw });
  if (!parsedQuery.success) {
    return NextResponse.json(
      { error: { code: "bad_request", message: "A `url` query parameter is required" } },
      { status: 400 },
    );
  }

  const parsed = parseSourceUrl(parsedQuery.data.url);
  if (!parsed) {
    return ok({ parsed: null, app: null, reason: "unrecognised" }, 0);
  }

  try {
    const client = getOmnisource();
    const repoName = parsed.slug?.split("/")[1] ?? parsed.slug;
    const target = normaliseRepo(parsed.url);

    // 1. Direct id/slug lookup — cheapest and most precise path.
    if (repoName) {
      const direct = await client.getApp(repoName, { revalidate: 60 });
      if (direct && normaliseRepo(direct.repository) === target) {
        return ok({ parsed, app: direct, reason: "indexed" }, 300);
      }
    }

    // 2. Fall back to the search engine and match on repository identity.
    const term = repoName ?? parsed.slug ?? parsed.url;
    const results = await client.search(term, { perPage: 20 }, { revalidate: 60 });
    const match = results.items.find((app) => normaliseRepo(app.repository) === target);

    return ok(
      { parsed, app: match ?? null, reason: match ? "indexed" : "not-indexed" },
      300,
    );
  } catch (error) {
    return fail(error);
  }
}
