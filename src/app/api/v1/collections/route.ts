/** GET /api/v1/collections — public collections (editorial + generated). */
import type { NextRequest } from "next/server";

import { getOmnisource } from "@/lib/omnisource";
import { fail, intParam, ok } from "@/lib/omnisource/http";

export const revalidate = 600;

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const result = await getOmnisource().getCollections(
      intParam(params.get("page"), 1, 1, 1000),
      intParam(params.get("per_page"), 30, 1, 100),
    );
    return ok(result);
  } catch (error) {
    return fail(error);
  }
}
