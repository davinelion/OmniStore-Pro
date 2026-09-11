/** GET /api/v1/search — OmniSource's search engine, proxied verbatim. */
import type { NextRequest } from "next/server";

import { getOmnisource } from "@/lib/omnisource";
import { boolParam, fail, intParam, ok } from "@/lib/omnisource/http";

export const revalidate = 60;

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const result = await getOmnisource().search(params.get("q") ?? "", {
      platform: params.get("platform") ?? undefined,
      category: params.get("category") ?? undefined,
      developer: params.get("developer") ?? undefined,
      license: params.get("license") ?? undefined,
      architecture: params.get("architecture") ?? undefined,
      openSource: boolParam(params.get("open_source")),
      minTrust: params.get("min_trust")
        ? intParam(params.get("min_trust"), 0, 0, 100)
        : undefined,
      sort: params.get("sort") ?? undefined,
      page: intParam(params.get("page"), 1, 1, 10_000),
      perPage: intParam(params.get("per_page"), 24, 1, 100),
    });
    return ok(result);
  } catch (error) {
    return fail(error);
  }
}
