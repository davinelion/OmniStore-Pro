/** GET /api/v1/trust/{id} — trust report (v1 wire pass-through). */
import { getOmnisource } from "@/lib/omnisource";
import { TrustResponseSchema } from "@omnistore/shared-models";
import { fail, notFoundResponse, ok } from "@/lib/omnisource/http";
import { OmniSourceError } from "@/lib/omnisource";

export const revalidate = 600;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const dto = await getOmnisource().request(
      `/trust/${encodeURIComponent(decodeURIComponent(id))}`,
      TrustResponseSchema,
      { tags: ["trust", `app:${id}`], revalidate: 600 },
    );
    return ok(dto);
  } catch (error) {
    if (error instanceof OmniSourceError && error.status === 404) return notFoundResponse();
    return fail(error);
  }
}
