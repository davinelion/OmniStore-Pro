/** GET /api/v1/recommendations/trending — explained trending recommendations. */
import type { NextRequest } from "next/server";
import { RecommendationResponseSchema } from "@omnistore/shared-models";
import { getOmnisource } from "@/lib/omnisource";
import { fail, intParam, ok } from "@/lib/omnisource/http";

export const revalidate = 600;

export async function GET(request: NextRequest) {
  try {
    const limit = intParam(request.nextUrl.searchParams.get("limit"), 12, 1, 100);
    const dto = await getOmnisource().request(`/recommendations/trending?limit=${limit}`, RecommendationResponseSchema, { tags: ["recommendations", "trending"], revalidate: 600 });
    return ok(dto);
  } catch (error) {
    return fail(error);
  }
}
