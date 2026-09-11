/**
 * GET  /api/v1/me/favorites — cloud favorites for the signed-in subject.
 * POST /api/v1/me/favorites — add one favorite.
 * DELETE /api/v1/me/favorites?app={id} — remove one favorite.
 *
 * The OmniSource subject is derived server-side from the session cookie;
 * the browser never sees it and cannot forge another subject.
 */
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";

import { getOmnisource } from "@/lib/omnisource";
import { fail } from "@/lib/omnisource/http";
import { SUBJECT_COOKIE } from "@/lib/omnisource/subject";

export const dynamic = "force-dynamic";

async function requireSubject(): Promise<string | null> {
  const store = await cookies();
  return store.get(SUBJECT_COOKIE)?.value ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const subject = await requireSubject();
    if (!subject) {
      return Response.json({ error: { code: "unauthorized", message: "Sign in required" } }, { status: 401 });
    }
    const params = request.nextUrl.searchParams;
    const page = Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1);
    const perPage = Math.min(100, Math.max(1, Number.parseInt(params.get("per_page") ?? "50", 10) || 50));
    const result = await getOmnisource().request(
      `/favorites?page=${page}&per_page=${perPage}`,
      z.object({
        items: z.array(z.object({ app: z.unknown(), created_at: z.string().nullable() })).catch([]),
        total: z.number().catch(0),
        page: z.number().catch(1),
        per_page: z.number().catch(50),
      }),
      { subject, noStore: true },
    );
    return Response.json(result);
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const subject = await requireSubject();
    if (!subject) {
      return Response.json({ error: { code: "unauthorized", message: "Sign in required" } }, { status: 401 });
    }
    const parsed = z.object({ app_id: z.string().min(1).max(255) }).safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json({ error: { code: "bad_request", message: "app_id required" } }, { status: 400 });
    }
    await getOmnisource().request(
      "/favorites",
      z.object({}).passthrough().optional(),
      { method: "POST", body: { app_id: parsed.data.app_id }, subject, noStore: true, retries: 1 },
    );
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const subject = await requireSubject();
    if (!subject) {
      return Response.json({ error: { code: "unauthorized", message: "Sign in required" } }, { status: 401 });
    }
    const appId = request.nextUrl.searchParams.get("app");
    if (!appId) {
      return Response.json({ error: { code: "bad_request", message: "app required" } }, { status: 400 });
    }
    await getOmnisource().request(
      `/favorites/${encodeURIComponent(appId)}`,
      z.object({}).passthrough().optional(),
      { method: "DELETE", subject, noStore: true, retries: 1 },
    );
    return Response.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
