/**
 * Browser API client for the OmniStore BFF (`/api/v1/*`).
 *
 * Every response is validated with Zod before it reaches a component. Raw
 * upstream payloads are never trusted, and transport failures are normalised
 * into a typed error the UI can render without leaking internals.
 */

import { z } from "zod";

import {
  ApiErrorSchema,
  AppListSchema,
  AppSchema,
  CategorySchema,
  CollectionSchema,
  DeveloperSchema,
  PlatformInfoSchema,
  ReleaseSchema,
  type App,
  type AppList,
  type Category,
  type Collection,
  type Developer,
  type PlatformInfo,
  type Release,
} from "@/lib/schemas/omnisource";
import { filtersToQuery, type SearchFilters } from "@/lib/search/query";
import type {
  AppListResult,
  CatalogStats,
  CollectionResult,
  DeveloperResult,
  HomeResult,
  LatestResult,
  TrendingResult,
} from "./provider";
import { FeatureFlagsSchema } from "@/lib/schemas/config";

export type ApiErrorKind = "network" | "offline" | "http" | "validation" | "unknown";

export class OmniStoreApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;

  constructor(kind: ApiErrorKind, message: string, status?: number) {
    super(message);
    this.name = "OmniStoreApiError";
    this.kind = kind;
    this.status = status;
  }
}

/** User-facing message. Server internals are never surfaced. */
export function userFacingError(error: unknown): string {
  if (error instanceof OmniStoreApiError) {
    switch (error.kind) {
      case "offline":
        return "You appear to be offline. Showing cached information when possible.";
      case "network":
        return "Unable to reach OmniStore. Check your connection and try again.";
      case "validation":
        return "OmniSource returned data OmniStore could not verify.";
      case "http":
        return error.status === 404
          ? "That item could not be found."
          : "OmniStore could not complete that request.";
      default:
        return "Something went wrong. Please try again.";
    }
  }
  return "Something went wrong. Please try again.";
}

async function request<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: { accept: "application/json", ...(init?.headers ?? {}) },
    });
  } catch {
    const offline = typeof navigator !== "undefined" && navigator.onLine === false;
    throw new OmniStoreApiError(offline ? "offline" : "network", "Request failed");
  }

  if (!res.ok) {
    // Try to read a structured error, but never trust or display it verbatim.
    const body = (await res.json().catch(() => null)) as unknown;
    const parsed = ApiErrorSchema.safeParse(body);
    const code = parsed.success ? parsed.data.error.code : `http_${res.status}`;
    throw new OmniStoreApiError("http", code, res.status);
  }

  const json: unknown = await res.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new OmniStoreApiError("validation", "Response failed schema validation");
  }
  return parsed.data;
}

/* ------------------------------------------------------------------ */
/* Response schemas                                                    */
/* ------------------------------------------------------------------ */

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

const AppListEnvelope = AppListSchema.pick({ items: true, pagination: true }).extend({
  freshness: z.string().nullable().optional(),
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

const ReleaseFeedItemSchema = z.object({
  app: z.object({ id: z.string(), slug: z.string(), name: z.string(), icon_url: z.string().nullable() }),
  release: ReleaseSchema,
});

const LatestSchema = z.object({
  added: z.array(AppSchema),
  updated: z.array(AppSchema),
  releases: z.array(ReleaseFeedItemSchema),
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

const ConfigSchema = z.object({
  site: z.object({
    name: z.string(),
    version: z.string(),
    description: z.string(),
  }),
  flags: FeatureFlagsSchema,
  provider: z.object({ name: z.string(), origin: z.string() }),
  freshness: z.string().nullable(),
});

export type SiteConfig = z.infer<typeof ConfigSchema>;

/* ------------------------------------------------------------------ */
/* Client                                                              */
/* ------------------------------------------------------------------ */

function qs(filters: Partial<SearchFilters>): string {
  const query = filtersToQuery(filters);
  return query ? `?${query}` : "";
}

export const omniClient = {
  getApps: (filters: Partial<SearchFilters> = {}) =>
    request(`/api/v1/apps${qs(filters)}`, AppListEnvelope) as Promise<AppListResult>,

  search: (filters: Partial<SearchFilters>) =>
    request(`/api/v1/search${qs(filters)}`, AppListEnvelope) as Promise<AppListResult>,

  getApp: (idOrSlug: string) => request(`/api/v1/apps/${encodeURIComponent(idOrSlug)}`, AppSchema) as Promise<App>,

  getAppsByIds: (ids: string[]) =>
    request(`/api/v1/apps?ids=${ids.map(encodeURIComponent).join(",")}`, AppListEnvelope) as Promise<AppListResult>,

  getCategories: () =>
    request(`/api/v1/categories`, z.object({ items: z.array(CategorySchema) })).then((r) => r.items) as Promise<Category[]>,

  getPlatforms: () =>
    request(`/api/v1/platforms`, z.object({ items: z.array(PlatformInfoSchema) })).then(
      (r) => r.items,
    ) as Promise<PlatformInfo[]>,

  getTrending: () => request(`/api/v1/trending`, TrendingSchema) as Promise<TrendingResult>,

  getLatest: () => request(`/api/v1/latest`, LatestSchema) as Promise<LatestResult>,

  getHome: () => request(`/api/v1/home`, HomeSchema) as Promise<HomeResult>,

  getReleases: (idOrSlug: string) =>
    request(
      `/api/v1/apps/${encodeURIComponent(idOrSlug)}/releases`,
      z.object({ items: z.array(ReleaseSchema) }),
    ).then((r) => r.items) as Promise<Release[]>,

  getAlternatives: (idOrSlug: string) =>
    request(
      `/api/v1/apps/${encodeURIComponent(idOrSlug)}/alternatives`,
      z.object({ items: z.array(AppSchema) }),
    ).then((r) => r.items) as Promise<App[]>,

  getSimilar: (idOrSlug: string) =>
    request(
      `/api/v1/apps/${encodeURIComponent(idOrSlug)}/similar`,
      z.object({ items: z.array(AppSchema) }),
    ).then((r) => r.items) as Promise<App[]>,

  getCollections: () =>
    request(`/api/v1/collections`, z.object({ items: z.array(CollectionSchema) })).then(
      (r) => r.items,
    ) as Promise<Collection[]>,

  getCollection: (slug: string) =>
    request(
      `/api/v1/collections/${encodeURIComponent(slug)}`,
      z.object({ collection: CollectionSchema, apps: z.array(AppSchema) }),
    ) as Promise<CollectionResult>,

  getDeveloper: (slug: string) =>
    request(
      `/api/v1/developers/${encodeURIComponent(slug)}`,
      DeveloperResultSchema,
    ) as Promise<DeveloperResult>,

  getDevelopers: () =>
    request(
      `/api/v1/developers`,
      z.object({ items: z.array(DeveloperSchema.and(z.object({ app_count: z.number() }))) }),
    ).then((r) => r.items) as Promise<Array<Developer & { app_count: number }>>,

  getStats: () =>
    request(`/api/v1/stats`, z.object({ stats: StatsSchema })).then((r) => r.stats) as Promise<CatalogStats>,

  getLicenses: () =>
    request(
      `/api/v1/licenses`,
      z.object({ items: z.array(z.object({ id: z.string(), name: z.string(), count: z.number() })) }),
    ).then((r) => r.items) as Promise<Array<{ id: string; name: string; count: number }>>,

  getConfig: () => request(`/api/v1/config`, ConfigSchema) as Promise<SiteConfig>,

  submitReport: (payload: unknown) =>
    request(`/api/v1/reports`, z.object({ ok: z.boolean(), id: z.string().optional() }), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }),
};

/* ------------------------------------------------------------------ */
/* Query keys (TanStack Query)                                         */
/* ------------------------------------------------------------------ */

export const queryKeys = {
  apps: (filters: Partial<SearchFilters>) => ["apps", filtersToQuery(filters)] as const,
  search: (filters: Partial<SearchFilters>) => ["search", filtersToQuery(filters)] as const,
  app: (id: string) => ["app", id] as const,
  appsByIds: (ids: string[]) => ["apps-by-ids", [...ids].sort().join(",")] as const,
  categories: () => ["categories"] as const,
  platforms: () => ["platforms"] as const,
  trending: () => ["trending"] as const,
  latest: () => ["latest"] as const,
  home: () => ["home"] as const,
  releases: (id: string) => ["releases", id] as const,
  alternatives: (id: string) => ["alternatives", id] as const,
  similar: (id: string) => ["similar", id] as const,
  collections: () => ["collections"] as const,
  collection: (slug: string) => ["collection", slug] as const,
  developer: (slug: string) => ["developer", slug] as const,
  developers: () => ["developers"] as const,
  stats: () => ["stats"] as const,
  licenses: () => ["licenses"] as const,
  config: () => ["config"] as const,
};

export type { AppList };
