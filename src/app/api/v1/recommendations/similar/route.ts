/** GET /api/v1/recommendations/similar — content-based recommendations. */
import type { NextRequest } from "next/server";
import { RecommendationResponseSchema } from "@omnistore/shared-models";
import { getOmnisource } from "@/lib/omnisource";
import { fail, intParam, ok } from "@/lib/omnisource/http";

export const revalidate = 600;

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const appId = params.get("app_id");
    if (!appId) return Response.json({ error: { code: "bad_request", message: "app_id is required" } }, { status: 400 });
    const dto = await getOmnisource().request(`/recommendations/similar?app_id=${encodeURIComponent(appId)}&limit=${intParam(params.get("limit"), 8, 1, 100)}`, RecommendationResponseSchema, { tags: ["recommendations", `app:${appId}`], revalidate: 600 });
    return ok(dto);
  } catch (error) {
    return fail(error);
  }
}
