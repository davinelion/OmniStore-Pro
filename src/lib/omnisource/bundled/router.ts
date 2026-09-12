/**
 * Bundled catalog router — maps OmniSource v1 wire paths to in-process data.
 *
 * `OmniSourceClient` calls this instead of `fetch` when no live OmniSource is
 * configured. The routing mirrors `scripts/mock-omnisource.mjs` so behaviour
 * is identical whether the snapshot is served in-process or over HTTP during
 * E2E. Unknown resources throw `OmniSourceError(404)`, which the client maps
 * to `null` (convenience getters) or a 404 envelope (proxy routes).
 */

import { OmniSourceError } from "../client";
import {
  bySlug,
  catalogCategories,
  catalogCategory,
  catalogCollection,
  catalogCollections,
  catalogDeveloper,
  catalogDevelopers,
  catalogPlatforms,
  catalogStats,
  latestApps,
  listApps,
  recommendationsAll,
  recommendationsDiscover,
  recommendationsSimilar,
  recommendationsTrending,
  securityFor,
  trendingApps,
  trustFor,
} from "./catalog";

export function bundledRoute(method: string, pathname: string, search: URLSearchParams): unknown {
  const path = (pathname.replace(/\/+$/, "") || "/").replace(/^\/api\/v\d+/, "") || "/";
  const parts = path.split("/").filter(Boolean);

  // Health probe on the service root.
  if (path === "/health" || path === "/api/v1/health") {
    return { status: "ok", timestamp: new Date().toISOString() };
  }

  if (path === "/stats") return catalogStats();

  if (path === "/apps" || path === "/search") {
    return listApps(Object.fromEntries(search.entries()), path === "/search");
  }

  if (parts[0] === "apps" && parts.length === 2) {
    const subject = bySlug(decodeURIComponent(parts[1]!));
    return subject ?? notFound();
  }

  if (path === "/trending") return trendingApps();
  if (path === "/latest") return latestApps();

  if (path === "/categories") return catalogCategories();
  if (parts[0] === "categories" && parts.length === 2) {
    const category = catalogCategory(decodeURIComponent(parts[1]!));
    return category ?? notFound();
  }

  if (path === "/platforms") return catalogPlatforms();

  if (path === "/developers") return catalogDevelopers();
  if (parts[0] === "developers" && parts.length === 2) {
    const developer = catalogDeveloper(decodeURIComponent(parts[1]!));
    return developer ?? notFound();
  }

  if (path === "/collections") return { items: catalogCollections(), total: catalogCollections().length, page: 1, per_page: 100 };
  if (parts[0] === "collections" && parts.length === 2) {
    const collection = catalogCollection(decodeURIComponent(parts[1]!));
    return collection ?? notFound();
  }

  if (path === "/recommendations") {
    const slug = search.get("app_id") ?? search.get("slug") ?? "";
    if (!bySlug(slug)) return notFound();
    return recommendationsAll(slug, Number.parseInt(search.get("limit") ?? "12", 10) || 12);
  }
  if (path === "/recommendations/similar") {
    const slug = search.get("app_id") ?? "";
    if (!bySlug(slug)) return notFound();
    return recommendationsSimilar(slug, Number.parseInt(search.get("limit") ?? "8", 10) || 8);
  }
  if (path === "/recommendations/trending") {
    return recommendationsTrending(Number.parseInt(search.get("limit") ?? "8", 10) || 8);
  }
  if (path === "/recommendations/discover") {
    const sort = search.get("sort") === "popular" ? "popular" : "new";
    return recommendationsDiscover(sort, Number.parseInt(search.get("limit") ?? "12", 10) || 12, search.get("category") ?? undefined);
  }

  if (parts[0] === "trust" && parts.length === 2) {
    const report = trustFor(decodeURIComponent(parts[1]!));
    return report ?? notFound();
  }
  if (parts[0] === "security" && parts.length === 2) {
    const report = securityFor(decodeURIComponent(parts[1]!));
    return report ?? notFound();
  }

  // Analytics POST — acknowledge and drop (opt-in telemetry has no bundled sink).
  if (path === "/analytics/events") return { accepted: 0 };

  return notFound();
}

function notFound(): never {
  throw new OmniSourceError(404, "not_found", "Not found in the bundled catalog");
}
