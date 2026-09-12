/**
 * POST /api/v1/sources/refresh  { ids: string[] }
 *
 * Re-reads the current release version of every tracked app so the client can
 * diff it against the version the user last acknowledged. Version diffing is
 * the whole point of tracking, so it happens here — from OmniSource — and
 * never from a value the client supplies.
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import { getOmnisource } from "@/lib/omnisource";
import { ok } from "@/lib/omnisource/http";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const BodySchema = z.object({
  ids: z.array(z.string().min(1).max(200)).min(1).max(200),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "bad_request", message: "`ids` must be a non-empty array" } },
      { status: 400 },
    );
  }

  const client = getOmnisource();
  // De-duplicate while preserving order; a tracked list can contain repeats.
  const ids = [...new Set(parsed.data.ids)];

  const settled = await Promise.allSettled(
    ids.map((id) => client.getApp(id, { revalidate: 60, timeoutMs: 8000 })),
  );

  const items = settled.flatMap((result, index) => {
    if (result.status !== "fulfilled" || result.value === null) return [];
    const app = result.value;
    return [
      {
        appId: ids[index]!,
        version: app.version,
        releasedAt: app.latestRelease?.releasedAt ?? app.updatedAt ?? null,
      },
    ];
  });

  // Apps OmniSource no longer knows about are omitted rather than invented:
  // the client keeps the last known version and stops claiming an update.
  return ok({ items }, 0);
}
