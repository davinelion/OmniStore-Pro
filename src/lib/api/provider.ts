/**
 * The OmniSource provider contract.
 *
 * Presentation code depends ONLY on this interface. Swapping the bundled
 * OmniSource feed for a live OmniSource deployment is a configuration change
 * (`NEXT_PUBLIC_OMNISOURCE_API_URL`), not a rewrite — and future native
 * clients can reuse the same contract.
 */

import type {
  App,
  Category,
  Collection,
  Developer,
  PlatformInfo,
  Release,
} from "@/lib/schemas/omnisource";
import type { SearchFilters } from "@/lib/search/query";

export type AppListResult = {
  items: App[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
  /** ISO timestamp of the upstream snapshot this answer was derived from. */
  freshness: string | null;
};

export type TrendingResult = {
  /** Highest popularity score in the catalog. */
  popular: App[];
  /** Most recent releases. */
  released: App[];
  /** Shortest release cadence among actively maintained projects. */
  fastMoving: App[];
  freshness: string | null;
};

export type LatestResult = {
  added: App[];
  updated: App[];
  releases: Array<{ app: Pick<App, "id" | "slug" | "name" | "icon_url">; release: Release }>;
  freshness: string | null;
};

export type HomeResult = {
  featured: App[];
  popular: App[];
  updated: App[];
  newest: App[];
  crossPlatform: App[];
  categories: Category[];
  platforms: PlatformInfo[];
  stats: CatalogStats;
  freshness: string | null;
};

export type CatalogStats = {
  apps: number;
  releases: number;
  assets: number;
  developers: number;
  categories: number;
  platforms: number;
  openSource: number;
  validatedAssets: number;
};

export type DeveloperResult = {
  developer: Developer;
  apps: App[];
  platforms: string[];
  licenses: Array<{ id: string; name: string }>;
  latestReleases: Array<{ app: Pick<App, "id" | "slug" | "name">; release: Release }>;
};

export type CollectionResult = {
  collection: Collection;
  apps: App[];
};

export interface OmniSourceProvider {
  /** Human readable provider identity, surfaced in /docs and /api/v1/health. */
  readonly name: string;
  /** Where the data physically comes from. */
  readonly origin: string;

  getFeedMeta(): Promise<{ generated_at: string; generator: string; upstream: string; app_count: number }>;
  getApps(filters: SearchFilters): Promise<AppListResult>;
  search(filters: SearchFilters): Promise<AppListResult>;
  getApp(idOrSlug: string): Promise<App | null>;
  getAppsByIds(ids: string[]): Promise<App[]>;
  getCategories(): Promise<Category[]>;
  getPlatforms(): Promise<PlatformInfo[]>;
  getCollections(): Promise<Collection[]>;
  getCollection(slug: string): Promise<CollectionResult | null>;
  getTrending(): Promise<TrendingResult>;
  getLatest(): Promise<LatestResult>;
  getHome(): Promise<HomeResult>;
  getDeveloper(slug: string): Promise<DeveloperResult | null>;
  getDevelopers(): Promise<Array<Developer & { app_count: number }>>;
  getReleases(idOrSlug: string): Promise<Release[]>;
  getAlternatives(idOrSlug: string): Promise<App[]>;
  getSimilar(idOrSlug: string): Promise<App[]>;
  getStats(): Promise<CatalogStats>;
  getLicenses(): Promise<Array<{ id: string; name: string; count: number }>>;
}
