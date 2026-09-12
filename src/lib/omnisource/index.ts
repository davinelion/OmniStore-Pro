/**
 * OmniSource SDK for OmniStore clients.
 *
 * Usage:
 *   import { getOmnisource } from "@/lib/omnisource";
 *   const app = await getOmnisource().getApp("localsend");
 *
 * `getOmnisource()` returns a per-runtime singleton configured from
 * OMNISOURCE_API_URL / NEXT_PUBLIC_OMNISOURCE_API_URL. When no upstream is
 * configured it serves a bundled, contract-valid catalog in-process, so the
 * storefront works out of the box; set OMNISOURCE_API_URL to go live.
 */

import { OmniSourceClient } from "./client";

export { OmniSourceClient, OmniSourceError } from "./client";
export type { OmniSourceClientOptions, RequestOptions } from "./client";
export { AppsApi } from "./apps";
export { SearchApi } from "./search";
export { CollectionsApi } from "./collections";
export { DevelopersApi } from "./developers";
export { RecommendationsApi } from "./recommendations";
export { CategoriesApi } from "./categories";
export { TrustApi } from "./trust";
export { SecurityApi } from "./security";
export { AnalyticsApi } from "./analytics";
export { filtersToSearchParams } from "./params";

let serverInstance: OmniSourceClient | null = null;

/** Server-side singleton (per process). */
export function getOmnisource(): OmniSourceClient {
  if (typeof window === "undefined") {
    if (!serverInstance) serverInstance = OmniSourceClient.fromEnv();
    return serverInstance;
  }
  // Browsers get a fresh, environment-configured client each call — cheap,
  // and it honors runtime env changes in dev.
  return OmniSourceClient.fromEnv();
}

/** For tests and edge runtimes: construct an explicit client. */
export function createOmnisource(
  baseUrl: string,
  apiKey?: string,
  options?: ConstructorParameters<typeof OmniSourceClient>[2],
): OmniSourceClient {
  return new OmniSourceClient(baseUrl, apiKey, options);
}
