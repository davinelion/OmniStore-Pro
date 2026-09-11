/** GET /api/v1/collections — public collections (v1 wire pass-through). */
import type { NextRequest } from "next/server";

import { getOmnisource } from "@/lib/omnisource";
import { PaginatedCollectionsDtoSchema } from "@omnistore/shared-models";
import { fail, intParam, ok } from "@/lib/omnisource/http";

export const revalidate = 600;

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const dto = await getOmnisource().request(
      `/collections?page=${intParam(params.get("page"), 1, 1, 1000)}&per_page=${intParam(params.get("per_page"), 30, 1, 100)}`,
      PaginatedCollectionsDtoSchema,
      { tags: ["collections"], revalidate: 600 },
    );
    return ok(dto);
  } catch (error) {
    return fail(error);
  }
}
