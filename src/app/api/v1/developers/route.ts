/** GET /api/v1/developers — all indexed developers. */
import type { NextRequest } from "next/server";

import { getOmnisource } from "@/lib/omnisource";
import { fail, intParam, ok } from "@/lib/omnisource/http";

export const revalidate = 1800;

export async function GET(request: NextRequest) {
  try {
    const limit = intParam(request.nextUrl.searchParams.get("limit"), 120, 1, 500);
    return ok(await getOmnisource().getDevelopers(limit));
  } catch (error) {
    return fail(error);
  }
}
