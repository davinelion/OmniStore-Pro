/**
 * @omnistore/omnisource-sdk
 *
 * The framework-neutral OmniSource-Pro client. OmniStore's Next.js adapter
 * adds Next Data Cache tags and the bundled-feed development path, while this
 * package is the shared contract used by web, native and desktop clients.
 *
 * The SDK never invents catalog data: every method reads and validates the
 * corresponding OmniSource-Pro endpoint and returns normalized shared models.
 */

import {
  AppDtoSchema,
  CategoryDtoSchema,
  PaginatedAppsDtoSchema,
  PaginatedCollectionsDtoSchema,
  RecommendationResponseSchema,
  StatsDtoSchema,
  mapApp,
  mapCategory,
  mapCollection,
  mapPaginatedApps,
  mapRecommendations,
  type App,
  type AppSort,
  type Category,
  type Collection,
  type RecommendationResponse,
} from "@omnistore/shared-models";
import { z } from "zod";

export interface ApiRequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  headers?: Record<string, string>;
  /** Optional cache hints consumed by framework adapters. */
  cache?: RequestCache;
}

export interface AppQuery {
  q?: string;
  category?: string;
  platform?: string;
  developer?: string;
  sort?: AppSort | string;
  page?: number;
  perPage?: number;
  openSource?: boolean;
}

export interface PaginatedApps {
  items: App[];
  pagination: { page: number; perPage: number; total: number; totalPages: number };
}

export interface PaginatedCollections {
  items: Collection[];
  pagination: { page: number; perPage: number; total: number; totalPages: number };
}

export interface Stats {
  apps: number;
  releases: number;
  assets: number;
  repositories: number;
  sources: number;
  platforms: number;
  categories: number;
  downloads: number | null;
}

export class OmniSourceApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly url: string;

  constructor(message: string, status: number, code: string, url: string) {
    super(message);
    this.name = "OmniSourceApiError";
    this.status = status;
    this.code = code;
    this.url = url;
  }
}

const ListParamsSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  platform: z.string().optional(),
  developer: z.string().optional(),
  sort: z.string().optional(),
  page: z.number().int().positive().optional(),
  perPage: z.number().int().positive().max(100).optional(),
  openSource: z.boolean().optional(),
});

const StatsSchema = StatsDtoSchema;
const AppListSchema = PaginatedAppsDtoSchema;
const CollectionListSchema = PaginatedCollectionsDtoSchema;
const AppArraySchema = z.array(AppDtoSchema);
const CategoryArraySchema = z.array(CategoryDtoSchema);

function queryString(input: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === "") continue;
    const wireKey = key === "perPage" ? "per_page" : key === "openSource" ? "open_source" : key;
    params.set(wireKey, String(value));
  }
  return params.toString();
}

/**
 * A small dependency-free client surface. It accepts either OmniSource's live
 * `/api/v1` origin or the same-origin OmniStore proxy.
 */
export class OmniSourceApiClient {
  readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly defaultHeaders: Record<string, string>;
  private readonly requestFetch: typeof fetch;

  constructor(baseUrl: string, options: { apiKey?: string; headers?: Record<string, string>; fetch?: typeof fetch } = {}) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.apiKey = options.apiKey;
    this.requestFetch = options.fetch ?? fetch;
    this.defaultHeaders = {
      accept: "application/json",
      ...(this.apiKey ? { "x-api-key": this.apiKey } : {}),
      ...options.headers,
    };
  }

  /** getApps() — paginated catalog listing. */
  async getApps(query: AppQuery = {}, options?: ApiRequestOptions): Promise<PaginatedApps> {
    const parsed = ListParamsSchema.parse(query);
    const dto = await this.request(`/apps?${queryString(parsed)}`, AppListSchema, options);
    const perPage = parsed.perPage ?? 24;
    const mapped = mapPaginatedApps(dto as Parameters<typeof mapPaginatedApps>[0], perPage);
    return { items: mapped.items, pagination: mapped.pagination };
  }

  /** getApp() — one app by OmniSource id or slug. */
  async getApp(id: string, options?: ApiRequestOptions): Promise<App | null> {
    try {
      const dto = await this.request(`/apps/${encodeURIComponent(id)}`, AppDtoSchema, options);
      return mapApp(dto as Parameters<typeof mapApp>[0]);
    } catch (error) {
      if (error instanceof OmniSourceApiError && error.status === 404) return null;
      throw error;
    }
  }

  /** getCategories() — the source-owned taxonomy. */
  async getCategories(options?: ApiRequestOptions): Promise<Category[]> {
    const dto = await this.request("/categories", CategoryArraySchema, options);
    return dto.map((item) => mapCategory(item as Parameters<typeof mapCategory>[0]));
  }

  /** getTrending() — source-owned popularity ranking. */
  async getTrending(options?: ApiRequestOptions): Promise<App[]> {
    const dto = await this.request("/trending", AppArraySchema, options);
    return dto.map((item) => mapApp(item as Parameters<typeof mapApp>[0]));
  }

  /** getCollections() — editorial and generated collection summaries. */
  async getCollections(page = 1, perPage = 30, options?: ApiRequestOptions): Promise<PaginatedCollections> {
    const dto = await this.request(
      `/collections?${queryString({ page, perPage })}`,
      CollectionListSchema,
      options,
    );
    const collectionPage = dto as unknown as {
      items: Parameters<typeof mapCollection>[0][];
      page?: number;
      per_page?: number;
      total?: number;
    };
    const actualPerPage = collectionPage.per_page ?? perPage;
    const total = collectionPage.total ?? 0;
    return {
      items: collectionPage.items.map((item) => mapCollection(item)),
      pagination: {
        page: collectionPage.page ?? page,
        perPage: actualPerPage,
        total,
        totalPages: actualPerPage > 0 ? Math.ceil(total / actualPerPage) : 0,
      },
    };
  }

  /** getStats() — live catalog health and inventory metrics. */
  async getStats(options?: ApiRequestOptions): Promise<Stats> {
    const dto = await this.request("/stats", StatsSchema, options);
    return {
      apps: dto.applications ?? dto.total_apps ?? 0,
      releases: dto.releases ?? 0,
      assets: dto.assets ?? 0,
      repositories: dto.repositories ?? 0,
      sources: dto.sources ?? 0,
      platforms: dto.platforms ?? 0,
      categories: dto.categories ?? 0,
      downloads: dto.total_downloads ?? null,
    };
  }

  /** getRecommendations() — source-owned related app ranking. */
  async getRecommendations(id: string, limit = 12, options?: ApiRequestOptions): Promise<RecommendationResponse | null> {
    try {
      const dto = await this.request(
        `/recommendations?${queryString({ appId: id, limit })}`.replace("appId", "app_id"),
        RecommendationResponseSchema,
        options,
      );
      return mapRecommendations(dto as Parameters<typeof mapRecommendations>[0]);
    } catch (error) {
      if (error instanceof OmniSourceApiError && error.status === 404) return null;
      throw error;
    }
  }

  private async request<T>(path: string, schema: z.ZodType<T>, options: ApiRequestOptions = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 10_000);
    const abort = () => controller.abort(options.signal?.reason);
    options.signal?.addEventListener("abort", abort, { once: true });
    try {
      const response = await this.requestFetch(url, {
        method: "GET",
        headers: { ...this.defaultHeaders, ...options.headers },
        cache: options.cache,
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new OmniSourceApiError(
          `OmniSource request failed with ${response.status}`,
          response.status,
          response.status >= 500 ? "upstream_error" : "http_error",
          url,
        );
      }
      const parsed = schema.safeParse(await response.json());
      if (!parsed.success) {
        throw new OmniSourceApiError("OmniSource response failed validation", 502, "schema_mismatch", url);
      }
      return parsed.data;
    } catch (error) {
      if (error instanceof OmniSourceApiError) throw error;
      throw new OmniSourceApiError(
        error instanceof Error ? error.message : "Network request failed",
        0,
        "network_error",
        url,
      );
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener("abort", abort);
    }
  }
}

export type { App, Category, Collection, RecommendationResponse };
