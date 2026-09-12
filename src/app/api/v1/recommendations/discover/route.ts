/** GET /api/v1/recommendations/discover — source-owned discovery ranking. */
import type { NextRequest } from "next/server";
import { RecommendationResponseSchema } from "@omnistore/shared-models";
import { getOmnisource } from "@/lib/omnisource";
import { fail, intParam, ok } from "@/lib/omnisource/http";

export const revalidate = 600;

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const query = new URLSearchParams({ sort: params.get("sort") === "popular" ? "popular" : "new", limit: String(intParam(params.get("limit"), 12, 1, 100)) });
    if (params.get("category")) query.set("category", params.get("category")!);
    const dto = await getOmnisource().request(`/recommendations/discover?${query}`, RecommendationResponseSchema, { tags: ["recommendations"], revalidate: 600 });
    return ok(dto);
  } catch (error) {
    return fail(error);
  }
}
