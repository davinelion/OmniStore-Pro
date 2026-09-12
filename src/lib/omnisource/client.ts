/**
 * OmniSourceClient — the only way OmniStore talks to data.
 *
 * Every screen, route and component of every OmniStore client (web, iOS,
 * Android, desktop) obtains apps, search, collections, recommendations,
 * trust and security through this client. There is no local catalog, no
 * local search index, no local scoring, no local metadata store anywhere
 * in this repository.
 *
 * Features:
 * - timeout        per-request AbortController
 * - retry          exponential backoff on network errors and 5xx, never on 4xx
 * - caching        Next.js Data Cache + tags on the server, TTL memory cache
 *                  in the browser
 * - validation     every response body is parsed with shared zod schemas —
 *                  malformed upstream data degrades, it never crashes the UI
 * - errors         typed `OmniSourceError`, or `safe()` → `ApiResult<T>`
 */

import type { ApiError, ApiResult } from "@omnistore/shared-models";

/** Minimal validator interface — accepts any zod schema by its output type. */
export interface Validator<T> {
  safeParse(data: unknown): { success: true; data: T } | { success: false; error?: unknown };
}
import { AppsApi, type AppListParams } from "./apps";
import { AnalyticsApi } from "./analytics";
import { CategoriesApi } from "./categories";
import { CollectionsApi } from "./collections";
import { DevelopersApi } from "./developers";
import { RecommendationsApi } from "./recommendations";
import { SearchApi, type SearchParams } from "./search";
import { SecurityApi } from "./security";
import { TrustApi } from "./trust";
import type {
  App,
  Category,
  Collection,
  Developer,
  DeveloperProfile,
  Paginated,
  PlatformInfo,
  RecommendationResponse,
  TrustReport,
  SecurityReport,
} from "@omnistore/shared-models";

export type { ApiResult, ApiError, AppListParams, SearchParams };

/** Error thrown by OmniSourceClient on any failure. */
export class OmniSourceError extends Error implements ApiError {
  readonly status: number;
  readonly code: string;
  readonly url: string;

  constructor(status: number, code: string, message: string, url = "") {
    super(message);
    this.name = "OmniSourceError";
    this.status = status;
    this.code = code;
    this.url = url;
  }
}

export interface RequestOptions {
  method?: "GET" | "POST" | "DELETE" | "PUT";
  body?: unknown;
  headers?: Record<string, string>;
  /** Seconds a server-rendered response stays fresh (Next Data Cache). */
  revalidate?: number;
  /** Cache tags for server-side invalidation. */
  tags?: string[];
  /** Milliseconds before the request is abandoned. Default 10_000. */
  timeoutMs?: number;
  /** Retry attempts for network errors / 5xx. Default 2. */
  retries?: number;
  /** Stable per-user subject header for personal-data endpoints. */
  subject?: string;
  /** Skip caches entirely (fresh read). */
  noStore?: boolean;
  signal?: AbortSignal;
}

export interface OmniSourceClientOptions {
  /** Default cache window for server reads, seconds. Default 300. */
  revalidate?: number;
  /** Extra default headers. */
  headers?: Record<string, string>;
  /** Browser-side memory-cache TTL, seconds. Default 60. */
  clientCacheTtl?: number;
  fetch?: typeof fetch;
}

interface CacheEntry {
  expires: number;
  value: unknown;
}

const DEFAULT_TIMEOUT = 10_000;
const DEFAULT_RETRIES = 2;

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason instanceof Error ? signal.reason : new Error("aborted"));
      },
      { once: true },
    );
  });
}

export class OmniSourceClient {
  readonly baseUrl: string;
  readonly apiKey?: string;

  /** Endpoint groups (advanced use). */
  readonly appsApi: AppsApi;
  readonly searchApi: SearchApi;
  readonly collectionsApi: CollectionsApi;
  readonly developersApi: DevelopersApi;
  readonly recommendationsApi: RecommendationsApi;
  readonly categoriesApi: CategoriesApi;
  readonly trustApi: TrustApi;
  readonly securityApi: SecurityApi;
  readonly analyticsApi: AnalyticsApi;

  private readonly defaultRevalidate: number;
  private readonly defaultHeaders: Record<string, string>;
  private readonly clientCacheTtl: number;
  private readonly doFetch: typeof fetch;
  private static memory = new Map<string, CacheEntry>();

  constructor(baseUrl: string, apiKey?: string, options: OmniSourceClientOptions = {}) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.apiKey = apiKey || undefined;
    this.defaultRevalidate = options.revalidate ?? 300;
    this.defaultHeaders = {
      accept: "application/json",
      ...(apiKey ? { "x-api-key": apiKey } : {}),
      ...options.headers,
    };
    this.clientCacheTtl = options.clientCacheTtl ?? 60;
    // Bind lazily: Next.js patches global fetch (client and server) after
    // module evaluation, so capturing the binding at construction time can
    // freeze a stale/unpatched implementation in the browser.
    this.doFetch = options.fetch ?? ((input: RequestInfo | URL, init?: RequestInit) => fetch(input, init));

    this.appsApi = new AppsApi(this);
    this.searchApi = new SearchApi(this);
    this.collectionsApi = new CollectionsApi(this);
    this.developersApi = new DevelopersApi(this);
    this.recommendationsApi = new RecommendationsApi(this);
    this.categoriesApi = new CategoriesApi(this);
    this.trustApi = new TrustApi(this);
    this.securityApi = new SecurityApi(this);
    this.analyticsApi = new AnalyticsApi(this);
  }

  /* -------------------------------------------------------------- */
  /* Convenience API (stable across web and native clients)          */
  /* -------------------------------------------------------------- */

  /** Paginated, filtered, sorted catalog listing. */
  getApps(params: AppListParams = {}, options?: RequestOptions) {
    return this.appsApi.list(params, options);
  }

  /** One app by id or slug — `null` when OmniSource does not know it. */
  getApp(id: string, options?: RequestOptions) {
    return this.appsApi.get(id, options);
  }

  /** Engine-backed search. */
  search(query: string, params: SearchParams = {}, options?: RequestOptions) {
    return this.searchApi.query({ ...params, q: query }, options);
  }

  /** Public collections (editorial + generated), paginated. */
  getCollections(page = 1, perPage = 30, options?: RequestOptions): Promise<{
    items: Collection[];
    pagination: { page: number; perPage: number; total: number; totalPages: number };
  }> {
    return this.collectionsApi.list(page, perPage, options);
  }

  /** One collection with its ordered apps. */
  getCollection(slug: string, options?: RequestOptions) {
    return this.collectionsApi.get(slug, options);
  }

  /** OmniSource trending (popularity signals computed upstream). */
  getTrending(options?: RequestOptions): Promise<App[]> {
    return this.appsApi.trending(options);
  }

  /** Recommendations for one app: similar + alternatives + collaborative. */
  getRecommendations(id: string, limit = 12, options?: RequestOptions) {
    return this.recommendationsApi.forApp(id, limit, options);
  }

  /** Content-based similar apps. */
  getSimilar(id: string, limit = 8, options?: RequestOptions) {
    return this.recommendationsApi.similar(id, limit, options);
  }

  /** Developer profile with their apps. */
  getDeveloper(id: string, options?: RequestOptions): Promise<DeveloperProfile | null> {
    return this.developersApi.get(id, options);
  }

  /** All developers. */
  getDevelopers(limit = 60, options?: RequestOptions): Promise<Developer[]> {
    return this.developersApi.list(limit, options);
  }

  /** One category with a page of its apps. */
  getCategory(id: string, options?: RequestOptions) {
    return this.categoriesApi.get(id, options);
  }

  /** Full category taxonomy. */
  getCategories(options?: RequestOptions): Promise<Category[]> {
    return this.categoriesApi.list(options);
  }

  /** Platform taxonomy. */
  getPlatforms(options?: RequestOptions): Promise<PlatformInfo[]> {
    return this.categoriesApi.platforms(options);
  }

  /** Catalog-wide statistics. */
  getStats(options?: RequestOptions) {
    return this.appsApi.stats(options);
  }

  /** Editorial "featured" collection assembled in OmniSource. */
  getFeatured(options?: RequestOptions): Promise<Collection | null> {
    return this.collectionsApi.get("featured", options);
  }

  /** Recently released / updated apps. */
  getRecent(options?: RequestOptions): Promise<App[]> {
    return this.appsApi.recent(options);
  }

  /** Most popular apps by OmniSource popularity score. */
  getPopular(limit = 12, options?: RequestOptions): Promise<Paginated<App>> {
    return this.appsApi.popular(limit, options);
  }

  /** Transparent trust report (scores, factors, badges) — computed upstream. */
  getTrust(id: string, options?: RequestOptions): Promise<TrustReport | null> {
    return this.trustApi.get(id, options);
  }

  /** Security report with scan evidence — computed upstream. */
  getSecurity(id: string, options?: RequestOptions): Promise<SecurityReport | null> {
    return this.securityApi.get(id, options);
  }

  /** Opt-in count-only analytics event. */
  track(event: Parameters<AnalyticsApi["track"]>[0]): void {
    this.analyticsApi.track(event);
  }

  /**
   * Absolute URL of the upstream service's health probe.
   *
   * `/health` is mounted on the service root, *outside* the `/api/v1` prefix,
   * so it cannot be built by concatenating a path onto `baseUrl` — a `..`
   * segment only removes `v1` and yields `/api/health`, which 404s. Strip the
   * versioned prefix explicitly instead.
   */
  get healthUrl(): string {
    const root = this.baseUrl.replace(/\/api\/v\d+(?:\/.*)?$/, "");
    return `${root || this.baseUrl}/health`;
  }

  /**
   * Probe the upstream service.
   *
   * Resolves to `null` when the service is unreachable or unhealthy rather
   * than throwing, so callers can report a status without a try/catch.
   */
  async probeHealth(timeoutMs = 3000): Promise<{ status?: string } | null> {
    try {
      const response = await fetch(this.healthUrl, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: { accept: "application/json" },
        cache: "no-store",
      });
      if (!response.ok) return null;
      const json = (await response.json()) as { status?: string };
      return typeof json?.status === "string" ? { status: json.status } : {};
    } catch {
      return null;
    }
  }

  /* -------------------------------------------------------------- */
  /* Core request pipeline                                           */
  /* -------------------------------------------------------------- */

  private get isServer(): boolean {
    return typeof window === "undefined";
  }

  private clientCacheKey(url: string, init: RequestOptions): string {
    return JSON.stringify([url, init.method ?? "GET", init.body ?? null, init.subject ?? null]);
  }

  private readMemory<T>(key: string): T | null {
    if (this.isServer) return null;
    const entry = OmniSourceClient.memory.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      OmniSourceClient.memory.delete(key);
      return null;
    }
    return entry.value as T;
  }

  private writeMemory(key: string, value: unknown): void {
    if (this.isServer) return;
    // Bound the cache: drop the oldest quarter when over 256 entries.
    if (OmniSourceClient.memory.size > 256) {
      const drop = Math.ceil(OmniSourceClient.memory.size / 4);
      let i = 0;
      for (const k of OmniSourceClient.memory.keys()) {
        if (i++ >= drop) break;
        OmniSourceClient.memory.delete(k);
      }
    }
    OmniSourceClient.memory.set(key, {
      expires: Date.now() + this.clientCacheTtl * 1000,
      value,
    });
  }

  /** Low-level access for endpoint groups. Validated request or throw. */
  async request<T>(
    path: string,
    schema: Validator<T>,
    options: RequestOptions = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const method = options.method ?? "GET";
    const cacheKey = this.clientCacheKey(url, options);

    if (method === "GET" && !options.noStore) {
      const hit = this.readMemory<T>(cacheKey);
      if (hit !== null) return hit;
    }

    const headers: Record<string, string> = { ...this.defaultHeaders, ...options.headers };
    if (options.subject) headers["x-omnistore-subject"] = options.subject;
    if (options.body !== undefined) headers["content-type"] = "application/json";

    const retries = options.retries ?? DEFAULT_RETRIES;
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT;
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(new Error("timeout")), timeoutMs);
      const onOuterAbort = () => controller.abort(options.signal?.reason);
      options.signal?.addEventListener("abort", onOuterAbort, { once: true });

      try {
        const init: RequestInit & { next?: unknown } = {
          method,
          headers,
          signal: controller.signal,
        };
        if (options.body !== undefined) init.body = JSON.stringify(options.body);
        if (this.isServer && method === "GET" && !options.noStore) {
          init.next = {
            revalidate: options.revalidate ?? this.defaultRevalidate,
            ...(options.tags ? { tags: options.tags } : {}),
          };
        }

        const response = await this.doFetch(url, init);

        if (!response.ok) {
          const detail = await this.errorMessage(response);
          // Retry only server-side failures, never client errors.
          if (response.status >= 500 && attempt < retries) {
            lastError = new OmniSourceError(response.status, "upstream_error", detail, url);
            continue;
          }
          throw new OmniSourceError(response.status, httpCode(response.status), detail, url);
        }

        const text = await response.text();
        let json: unknown = null;
        if (text.length > 0) {
          try {
            json = JSON.parse(text);
          } catch {
            throw new OmniSourceError(502, "bad_json", "Upstream returned invalid JSON", url);
          }
        }

        const parsedResult = schema.safeParse(json);
        const parsed = parsedResult.success ? parsedResult.data : null;
        if (parsed === null) {
          throw new OmniSourceError(
            502,
            "schema_mismatch",
            "Upstream response did not match the OmniSource v1 contract",
            url,
          );
        }

        if (method === "GET" && !options.noStore) this.writeMemory(cacheKey, parsed);
        return parsed;
      } catch (error) {
        lastError = error;
        const isOmniErr = error instanceof OmniSourceError;
        const aborted = options.signal?.aborted === true;
        const retriable = !isOmniErr && attempt < retries && !aborted;
        if (retriable) {
          await sleep(400 * 2 ** attempt, options.signal).catch(() => {});
          continue;
        }
        if (isOmniErr) throw error;
        throw new OmniSourceError(
          0,
          aborted ? "aborted" : "network_error",
          error instanceof Error ? error.message : "Network failure",
          url,
        );
      } finally {
        clearTimeout(timer);
        options.signal?.removeEventListener("abort", onOuterAbort);
      }
    }

    throw lastError instanceof OmniSourceError
      ? lastError
      : new OmniSourceError(0, "network_error", "Request failed", url);
  }

  /** Like `request` but resolves to an `ApiResult` instead of throwing. */
  async safe<T>(
    path: string,
    schema: Validator<T>,
    options: RequestOptions = {},
  ): Promise<ApiResult<T>> {
    try {
      return { ok: true, data: await this.request(path, schema, options) };
    } catch (error) {
      if (error instanceof OmniSourceError) {
        return {
          ok: false,
          error: { status: error.status, code: error.code, message: error.message },
        };
      }
      return {
        ok: false,
        error: { status: 0, code: "unknown", message: "Unexpected client failure" },
      };
    }
  }

  private async errorMessage(response: Response): Promise<string> {
    try {
      const body = (await response.json()) as { detail?: unknown };
      if (typeof body.detail === "string") return body.detail;
      if (Array.isArray(body.detail)) {
        const first = body.detail[0] as { msg?: string } | undefined;
        if (first?.msg) return first.msg;
      }
    } catch {
      /* no body */
    }
    return `Upstream responded ${response.status}`;
  }

  /** Resolve the client for the current runtime from environment config. */
  static fromEnv(): OmniSourceClient {
    const serverUrl =
      process.env.OMNISOURCE_API_URL || process.env.NEXT_PUBLIC_OMNISOURCE_API_URL;
    const baseUrl =
      typeof window === "undefined"
        ? serverUrl || "http://127.0.0.1:8000/api/v1"
        : process.env.NEXT_PUBLIC_OMNISOURCE_API_URL || "/api/v1";
    const apiKey =
      (typeof window === "undefined" ? process.env.OMNISOURCE_API_KEY : undefined) ||
      process.env.NEXT_PUBLIC_OMNISOURCE_API_KEY ||
      undefined;
    return new OmniSourceClient(baseUrl, apiKey, {
      revalidate: Number(process.env.OMNISOURCE_REVALIDATE ?? 300),
    });
  }
}

function httpCode(status: number): string {
  switch (status) {
    case 400:
      return "bad_request";
    case 401:
      return "unauthorized";
    case 403:
      return "forbidden";
    case 404:
      return "not_found";
    case 422:
      return "invalid_subject";
    case 429:
      return "rate_limited";
    default:
      return "http_error";
  }
}
