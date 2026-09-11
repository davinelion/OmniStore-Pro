/** GET /api/v1/collections/{slug} — one collection (v1 wire pass-through). */
import { getOmnisource } from "@/lib/omnisource";
import { CollectionDtoSchema, PaginatedCollectionsDtoSchema } from "@omnistore/shared-models";
import { fail, notFoundResponse, ok } from "@/lib/omnisource/http";
import { OmniSourceError } from "@/lib/omnisource";

export const revalidate = 600;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    // Slug resolution happens upstream through the index (id-keyed detail).
    const index = await getOmnisource().request(
      "/collections?page=1&per_page=100",
      PaginatedCollectionsDtoSchema,
      { tags: ["collections", `collection:${slug}`], revalidate: 600 },
    );
    const items = (index as { items?: Array<{ slug: string; id: string }> }).items ?? [];
    const summary = items.find((item) => item.slug === decodeURIComponent(slug));
    if (!summary) return notFoundResponse();
    const dto = await getOmnisource().request(
      `/collections/${encodeURIComponent(summary.id)}`,
      CollectionDtoSchema,
      { tags: ["collections", `collection:${slug}`], revalidate: 600 },
    );
    return ok(dto);
  } catch (error) {
    if (error instanceof OmniSourceError && error.status === 404) return notFoundResponse();
    return fail(error);
  }
}
