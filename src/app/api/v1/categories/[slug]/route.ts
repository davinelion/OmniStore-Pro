/** GET /api/v1/categories/{slug} — category with a page of its apps. */
import type { NextRequest } from "next/server";

import { getOmnisource } from "@/lib/omnisource";
import { fail, intParam, notFoundResponse, ok } from "@/lib/omnisource/http";

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
      client.getCategory(decoded),
      client.getApps({
        category: decoded,
        page: intParam(request.nextUrl.searchParams.get("page"), 1, 1, 10_000),
        perPage: intParam(request.nextUrl.searchParams.get("per_page"), 24, 1, 100),
      }),
    ]);
    if (!category && apps.items.length === 0) return notFoundResponse();
    return ok({ category: category?.category ?? null, apps });
  } catch (error) {
    return fail(error);
  }
}
