/** GET /api/v1/developers/{slug} — developer record + their apps (wire). */
import { getOmnisource } from "@/lib/omnisource";
import { DeveloperDetailSchema, PaginatedAppsDtoSchema } from "@omnistore/shared-models";
import { fail, notFoundResponse, ok } from "@/lib/omnisource/http";
import { OmniSourceError } from "@/lib/omnisource";

export const revalidate = 600;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const decoded = decodeURIComponent(slug);
    const client = getOmnisource();
    const developer = await client.request(
      `/developers/${encodeURIComponent(decoded)}`,
      DeveloperDetailSchema,
      { tags: ["developers", `developer:${slug}`], revalidate: 600 },
    );
    const apps = await client.request(
      `/apps?developer=${encodeURIComponent(decoded)}&per_page=100&sort=popularity`,
      PaginatedAppsDtoSchema,
      { tags: ["apps", `developer:${slug}`], revalidate: 600 },
    );
    return ok({ ...developer, apps: { items: apps.items, total: apps.total } });
  } catch (error) {
    if (error instanceof OmniSourceError && error.status === 404) return notFoundResponse();
    return fail(error);
  }
}
