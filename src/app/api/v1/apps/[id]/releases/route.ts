/** GET /api/v1/apps/{id}/releases — release history (v1 wire pass-through). */
import { getOmnisource } from "@/lib/omnisource";
import { AppDtoSchema } from "@omnistore/shared-models";
import { fail, notFoundResponse, ok } from "@/lib/omnisource/http";
import { OmniSourceError } from "@/lib/omnisource";

export const revalidate = 300;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const dto = await getOmnisource().request(
      `/apps/${encodeURIComponent(decodeURIComponent(id))}`,
      AppDtoSchema,
      { tags: ["apps", `app:${id}`], revalidate: 300 },
    );
    return ok({
      app_id: dto.id,
      releases: dto.releases,
      latest_release: dto.latest_release ?? null,
    });
  } catch (error) {
    if (error instanceof OmniSourceError && error.status === 404) return notFoundResponse();
    return fail(error);
  }
}
