/** GET /api/v1/apps — filtered catalog listing (v1 wire pass-through). */
import type { NextRequest } from "next/server";

import { getOmnisource } from "@/lib/omnisource";
import { PaginatedAppsDtoSchema } from "@omnistore/shared-models";
import { boolParam, fail, intParam, ok } from "@/lib/omnisource/http";

export const revalidate = 300;

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
    if (boolParam(params.get("open_source")) !== undefined) {
      query.set("open_source", String(boolParam(params.get("open_source"))));
    }
    const dto = await getOmnisource().request(
      `/apps${query.size > 0 ? `?${query}` : ""}`,
      PaginatedAppsDtoSchema,
      { tags: ["apps"], revalidate: 300 },
    );
    return ok(dto);
  } catch (error) {
    return fail(error);
  }
}
