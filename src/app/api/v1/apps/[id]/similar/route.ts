/** GET /api/v1/apps/{id}/similar — engine recommendations (similar + alternatives). */
import { getOmnisource } from "@/lib/omnisource";
import { fail, intParam, notFoundResponse, ok } from "@/lib/omnisource/http";

export const revalidate = 600;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const limit = intParam(new URL(request.url).searchParams.get("limit"), 12, 1, 100);
    const recommendations = await getOmnisource().getRecommendations(decodeURIComponent(id), limit);
    if (!recommendations) return notFoundResponse();
    return ok(recommendations);
  } catch (error) {
    return fail(error);
  }
}
