/** GET /api/v1/apps — filtered catalog listing (proxied from OmniSource). */
import type { NextRequest } from "next/server";

import { getOmnisource } from "@/lib/omnisource";
import { boolParam, fail, intParam, ok } from "@/lib/omnisource/http";

export const revalidate = 300;

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const result = await getOmnisource().getApps({
      q: params.get("q") ?? undefined,
      platform: params.get("platform") ?? undefined,
      category: params.get("category") ?? undefined,
      developer: params.get("developer") ?? undefined,
      license: params.get("license") ?? undefined,
      architecture: params.get("architecture") ?? undefined,
      openSource: boolParam(params.get("open_source")),
      minTrust: params.get("min_trust") ? intParam(params.get("min_trust"), 0, 0, 100) : undefined,
      minQuality: params.get("min_quality") ? intParam(params.get("min_quality"), 0, 0, 100) : undefined,
      sort: params.get("sort") ?? undefined,
      page: intParam(params.get("page"), 1, 1, 10_000),
      perPage: intParam(params.get("per_page"), 24, 1, 100),
    });
    return ok(result);
  } catch (error) {
    return fail(error);
  }
}
