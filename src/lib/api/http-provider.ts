/**
 * Live OmniSource provider.
 *
 * Used when `NEXT_PUBLIC_OMNISOURCE_API_URL` points at a real OmniSource
 * deployment. Every response is validated with the OmniSource v1 schemas —
 * a malformed or hostile upstream can never crash the UI, it degrades into an
 * error state.
 */

import {
  AppListSchema,
  AppSchema,
  CategorySchema,
  CollectionSchema,
  DeveloperSchema,
  PlatformInfoSchema,
  ReleaseSchema,
  FeedMetaSchema,
  type App,
  type Category,
  type Collection,
  type PlatformInfo,
  type Release,
} from "@/lib/schemas/omnisource";
import { filtersToQuery, type SearchFilters } from "@/lib/search/query";
import { z } from "zod";
import type {
  AppListResult,
  CatalogStats,
  CollectionResult,
  DeveloperResult,
  HomeResult,
  LatestResult,
  OmniSourceProvider,
  TrendingResult,
} from "./provider";

const StatsSchema = z.object({
  apps: z.number(),
  releases: z.number(),
  assets: z.number(),
  developers: z.number(),
  categories: z.number(),
  platforms: z.number(),
  openSource: z.number(),
  validatedAssets: z.number(),
});

const HomeSchema = z.object({
  featured: z.array(AppSchema),
  popular: z.array(AppSchema),
  updated: z.array(AppSchema),
  newest: z.array(AppSchema),
  crossPlatform: z.array(AppSchema),
  categories: z.array(CategorySchema),
  platforms: z.array(PlatformInfoSchema),
  stats: StatsSchema,
  freshness: z.string().nullable(),
});

const TrendingSchema = z.object({
  popular: z.array(AppSchema),
  released: z.array(AppSchema),
  fastMoving: z.array(AppSchema),
  freshness: z.string().nullable(),
});

const LatestSchema = z.object({
  added: z.array(AppSchema),
  updated: z.array(AppSchema),
  releases: z.array(
    z.object({
      app: z.object({ id: z.string(), slug: z.string(), name: z.string(), icon_url: z.string().nullable() }),
      release: ReleaseSchema,
    }),
  ),
  freshness: z.string().nullable(),
});

const DeveloperResultSchema = z.object({
  developer: DeveloperSchema,
  apps: z.array(AppSchema),
  platforms: z.array(z.string()),
  licenses: z.array(z.object({ id: z.string(), name: z.string() })),
  latestReleases: z.array(
    z.object({
      app: z.object({ id: z.string(), slug: z.string(), name: z.string() }),
      release: ReleaseSchema,
    }),
  ),
});

export class HttpOmniSourceProvider implements OmniSourceProvider {
  readonly name = "omnisource-http";
  readonly origin: string;

  constructor(private readonly baseUrl: string) {
    this.origin = baseUrl;
  }

  private async get<T>(
    path: string,
    schema: z.ZodType<T, z.ZodTypeDef, unknown>,
    revalidate = 300,
  ): Promise<T | null> {
    const url = `${this.baseUrl}${path}`;
    try {
      const res = await fetch(url, {
        headers: { accept: "application/json" },
        next: { revalidate, tags: ["omnisource"] },
      });
      if (!res.ok) return null;
      const parsed = schema.safeParse(await res.json());
      return parsed.success ? parsed.data : null;
    } catch {
      // Network failure, DNS failure, bad TLS — all surface as "unavailable".
      return null;
    }
  }

  async getFeedMeta() {
    const data = await this.get("/api/v1/health", z.object({ meta: FeedMetaSchema }), 3600);
    return (
      data?.meta ?? {
        generated_at: new Date(0).toISOString(),
        generator: "unknown",
        upstream: "omnisource",
        app_count: 0,
      }
    );
  }

  async getApps(filters: SearchFilters): Promise<AppListResult> {
    const query = filtersToQuery(filters);
    const data = await this.get(`/api/v1/apps${query ? `?${query}` : ""}`, AppListSchema, 120);
    if (!data) {
      return { items: [], pagination: { page: 1, per_page: filters.perPage, total: 0, total_pages: 0 }, freshness: null };
    }
    return { items: data.items, pagination: data.pagination, freshness: data.meta?.generated_at ?? null };
  }

  async search(filters: SearchFilters): Promise<AppListResult> {
    const query = filtersToQuery(filters);
    const data = await this.get(`/api/v1/search${query ? `?${query}` : ""}`, AppListSchema, 60);
    if (!data) {
      return { items: [], pagination: { page: 1, per_page: filters.perPage, total: 0, total_pages: 0 }, freshness: null };
    }
    return { items: data.items, pagination: data.pagination, freshness: data.meta?.generated_at ?? null };
  }

  async getApp(idOrSlug: string): Promise<App | null> {
    return this.get(`/api/v1/apps/${encodeURIComponent(idOrSlug)}`, AppSchema, 300);
  }

  async getAppsByIds(ids: string[]): Promise<App[]> {
    if (!ids.length) return [];
    const data = await this.get(`/api/v1/apps?ids=${ids.map(encodeURIComponent).join(",")}`, AppListSchema, 300);
    return data?.items ?? [];
  }

  async getCategories(): Promise<Category[]> {
    const data = await this.get("/api/v1/categories", z.object({ items: z.array(CategorySchema) }), 3600);
    return data?.items ?? [];
  }

  async getPlatforms(): Promise<PlatformInfo[]> {
    const data = await this.get("/api/v1/platforms", z.object({ items: z.array(PlatformInfoSchema) }), 3600);
    return data?.items ?? [];
  }

  async getCollections(): Promise<Collection[]> {
    const data = await this.get("/api/v1/collections", z.object({ items: z.array(CollectionSchema) }), 3600);
    return data?.items ?? [];
  }

  async getCollection(slug: string): Promise<CollectionResult | null> {
    const data = await this.get(
      `/api/v1/collections/${encodeURIComponent(slug)}`,
      z.object({ collection: CollectionSchema, apps: z.array(AppSchema) }),
      3600,
    );
    return data ?? null;
  }

  async getTrending(): Promise<TrendingResult> {
    const data = await this.get("/api/v1/trending", TrendingSchema, 300);
    return data ?? { popular: [], released: [], fastMoving: [], freshness: null };
  }

  async getLatest(): Promise<LatestResult> {
    const data = await this.get("/api/v1/latest", LatestSchema, 300);
    return data ?? { added: [], updated: [], releases: [], freshness: null };
  }

  async getHome(): Promise<HomeResult> {
    const data = await this.get("/api/v1/home", HomeSchema, 300);
    return (
      data ?? {
        featured: [],
        popular: [],
        updated: [],
        newest: [],
        crossPlatform: [],
        categories: [],
        platforms: [],
        stats: {
          apps: 0,
          releases: 0,
          assets: 0,
          developers: 0,
          categories: 0,
          platforms: 0,
          openSource: 0,
          validatedAssets: 0,
        },
        freshness: null,
      }
    );
  }

  async getDeveloper(slug: string): Promise<DeveloperResult | null> {
    return this.get(`/api/v1/developers/${encodeURIComponent(slug)}`, DeveloperResultSchema, 600);
  }

  async getDevelopers(): Promise<Array<(typeof DeveloperSchema._type) & { app_count: number }>> {
    const data = await this.get(
      "/api/v1/developers",
      z.object({ items: z.array(DeveloperSchema.and(z.object({ app_count: z.number() }))) }),
      3600,
    );
    return data?.items ?? [];
  }

  async getReleases(idOrSlug: string): Promise<Release[]> {
    const data = await this.get(
      `/api/v1/apps/${encodeURIComponent(idOrSlug)}/releases`,
      z.object({ items: z.array(ReleaseSchema) }),
      300,
    );
    return data?.items ?? [];
  }

  async getAlternatives(idOrSlug: string): Promise<App[]> {
    const data = await this.get(
      `/api/v1/apps/${encodeURIComponent(idOrSlug)}/alternatives`,
      z.object({ items: z.array(AppSchema) }),
      600,
    );
    return data?.items ?? [];
  }

  async getSimilar(idOrSlug: string): Promise<App[]> {
    const data = await this.get(
      `/api/v1/apps/${encodeURIComponent(idOrSlug)}/similar`,
      z.object({ items: z.array(AppSchema) }),
      600,
    );
    return data?.items ?? [];
  }

  async getStats(): Promise<CatalogStats> {
    const data = await this.get("/api/v1/stats", z.object({ stats: StatsSchema }), 600);
    return (
      data?.stats ?? {
        apps: 0,
        releases: 0,
        assets: 0,
        developers: 0,
        categories: 0,
        platforms: 0,
        openSource: 0,
        validatedAssets: 0,
      }
    );
  }

  async getLicenses(): Promise<Array<{ id: string; name: string; count: number }>> {
    const data = await this.get(
      "/api/v1/licenses",
      z.object({ items: z.array(z.object({ id: z.string(), name: z.string(), count: z.number() })) }),
      3600,
    );
    return data?.items ?? [];
  }
}
