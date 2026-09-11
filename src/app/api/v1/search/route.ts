/** GET /api/v1/search — OmniSource's search engine (v1 wire pass-through). */
import type { NextRequest } from "next/server";

import { getOmnisource } from "@/lib/omnisource";
import { PaginatedAppsDtoSchema } from "@omnistore/shared-models";
import { fail, intParam, ok } from "@/lib/omnisource/http";

export const revalidate = 60;

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const query = new URLSearchParams();
    for (const key of [
      "q", "platform", "category", "developer", "license", "architecture",
      "open_source", "min_trust", "min_quality", "updated_since", "sort", "page", "per_page",
    ]) {
      const value = params.get(key);
      if (value) query.set(key, value);
    }
    query.set("page", String(intParam(params.get("page"), 1, 1, 10_000)));
    query.set("per_page", String(intParam(params.get("per_page"), 24, 1, 100)));
    const dto = await getOmnisource().request(`/search?${query}`, PaginatedAppsDtoSchema, {
      tags: ["search"],
      revalidate: 60,
    });
    return ok(dto);
  } catch (error) {
    return fail(error);
  }
}
