/**
 * OmniSource SDK for OmniStore clients.
 *
 * Usage:
 *   import { getOmnisource } from "@/lib/omnisource";
 *   const app = await getOmnisource().getApp("localsend");
 *
 * `getOmnisource()` returns a per-runtime singleton. Data resolution order:
 *
 *   1. A live OmniSource deployment — used whenever `OMNISOURCE_API_URL` (or
 *      `NEXT_PUBLIC_OMNISOURCE_API_URL`) is set. This is the intended
 *      production wiring.
 *   2. The bundled feed — `data/omnisource-feed.json`, produced by
 *      `npm run ingest` from real upstream repositories. Served in-process by
 *      `FeedBackedClient`, so a fresh deploy with no configuration still
 *      renders a complete catalog instead of an empty shell.
 *
 * Either way callers get the identical OmniSource v1 contract; nothing in the
 * UI knows which path answered. Browsers always go through the same-origin
 * `/api/v1` proxy, so the feed is never shipped to a client.
 */

import { OmniSourceClient } from "./client";
// Re-export the framework-neutral contract so non-Next clients and tests can
// share the exact same SDK entry point as the storefront.
export { OmniSourceApiClient, OmniSourceApiError } from "@omnistore/omnisource-sdk";
export type { ApiRequestOptions, AppQuery, PaginatedApps, PaginatedCollections, Stats } from "@omnistore/omnisource-sdk";
import { FeedBackedClient, FEED_BASE_URL } from "./feed/client";

export { OmniSourceClient, OmniSourceError } from "./client";
export type { OmniSourceClientOptions, RequestOptions } from "./client";
export { FeedBackedClient, FEED_BASE_URL } from "./feed/client";
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

/** Is a live OmniSource deployment configured for this runtime? */
function upstreamUrl(): string | undefined {
  const url = process.env.OMNISOURCE_API_URL || process.env.NEXT_PUBLIC_OMNISOURCE_API_URL;
  const trimmed = url?.trim();
  return trimmed ? trimmed : undefined;
}

/** Server-side singleton (per process). */
export function getOmnisource(): OmniSourceClient {
  if (typeof window === "undefined") {
    if (!serverInstance) {
      const url = upstreamUrl();
      serverInstance = url
        ? OmniSourceClient.fromEnv()
        : new FeedBackedClient({ revalidate: Number(process.env.OMNISTORE_REVALIDATE ?? 300) });
    }
    return serverInstance;
  }
  // Browsers get a fresh, environment-configured client each call — cheap,
  // and it honors runtime env changes in dev. They always use the HTTP proxy.
  return OmniSourceClient.fromEnv();
}

/** True when this runtime is serving from the bundled feed rather than upstream. */
export function isUsingBundledFeed(): boolean {
  if (typeof window !== "undefined") return false;
  return upstreamUrl() === undefined;
}

/** Test hook — drop the memoised server client. */
export function resetOmnisource(): void {
  serverInstance = null;
}

/** For tests and edge runtimes: construct an explicit client. */
export function createOmnisource(
  baseUrl: string,
  apiKey?: string,
  options?: ConstructorParameters<typeof OmniSourceClient>[2],
): OmniSourceClient {
  return new OmniSourceClient(baseUrl, apiKey, options);
}
