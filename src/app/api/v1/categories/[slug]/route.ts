/** GET /api/v1/categories/{slug} — category record + a page of apps (wire). */
import type { NextRequest } from "next/server";

import { getOmnisource } from "@/lib/omnisource";
import { CategoryDtoSchema, PaginatedAppsDtoSchema } from "@omnistore/shared-models";
import { fail, intParam, notFoundResponse, ok } from "@/lib/omnisource/http";
import { OmniSourceError } from "@/lib/omnisource";

export const revalidate = 600;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const decoded = decodeURIComponent(slug);
    const client = getOmnisource();
    const [category, apps] = await Promise.all([
      client.request(`/categories/${encodeURIComponent(decoded)}`, CategoryDtoSchema, {
        tags: ["categories", `category:${slug}`],
        revalidate: 600,
      }),
      client.request(
        `/apps?category=${encodeURIComponent(decoded)}&page=${intParam(request.nextUrl.searchParams.get("page"), 1, 1, 10_000)}&per_page=${intParam(request.nextUrl.searchParams.get("per_page"), 24, 1, 100)}`,
        PaginatedAppsDtoSchema,
        { tags: ["apps", `category:${slug}`], revalidate: 600 },
      ),
    ]);
    return ok({ category, apps });
  } catch (error) {
    if (error instanceof OmniSourceError && error.status === 404) return notFoundResponse();
    return fail(error);
  }
}
