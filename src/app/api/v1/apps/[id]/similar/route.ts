/** GET /api/v1/apps/{id}/similar — engine recommendations (v1 wire pass-through). */
import { getOmnisource } from "@/lib/omnisource";
import { RecommendationResponseSchema } from "@omnistore/shared-models";
import { fail, intParam, notFoundResponse, ok } from "@/lib/omnisource/http";
import { OmniSourceError } from "@/lib/omnisource";

export const revalidate = 600;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const limit = intParam(new URL(request.url).searchParams.get("limit"), 12, 1, 100);
    const dto = await getOmnisource().request(
      `/recommendations?app_id=${encodeURIComponent(decodeURIComponent(id))}&limit=${limit}`,
      RecommendationResponseSchema,
      { tags: ["recommendations", `app:${id}`], revalidate: 600 },
    );
    return ok(dto);
  } catch (error) {
    if (error instanceof OmniSourceError && error.status === 404) return notFoundResponse();
    return fail(error);
  }
}
