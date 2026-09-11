/**
 * Apps endpoint group — /api/v1/apps, /trending, /latest.
 * OmniSource owns the catalog, ranking and freshness; this module only
 * marshals filters and validates responses.
 */

import {
  AppDtoSchema,
  PaginatedAppsDtoSchema,
  mapApp,
  mapPaginatedApps,
  type App,
} from "@omnistore/shared-models";
import { z } from "zod";
import type { OmniSourceClient, RequestOptions } from "./client";
import { filtersToSearchParams } from "./params";

export interface AppListParams {
  q?: string;
  platform?: string;
  category?: string;
  developer?: string;
  license?: string;
  architecture?: string;
  openSource?: boolean;
  minTrust?: number;
  minQuality?: number;
  updatedSince?: string;
  sort?: string;
  page?: number;
  perPage?: number;
}

const TrendingSchema = z.array(AppDtoSchema);
const LatestSchema = z.array(AppDtoSchema);

export interface CatalogStats {
  apps: number;
  releases: number;
  assets: number;
  repositories: number;
  sources: number;
  platforms: number;
  categories: number;
  downloads: number | null;
}

const StatsSchema = z.object({
  applications: z.number().optional(),
  total_apps: z.number().optional(),
  repositories: z.number().optional(),
  releases: z.number().optional(),
  assets: z.number().optional(),
  sources: z.number().optional(),
  platforms: z.number().optional(),
  categories: z.number().optional(),
  total_downloads: z.number().nullable().optional(),
});

export class AppsApi {
  constructor(private readonly client: OmniSourceClient) {}

  /** Paginated, filtered, sorted catalog listing. */
  async list(params: AppListParams = {}, options: RequestOptions = {}) {
    const query = filtersToSearchParams({ ...params });
    const perPage = params.perPage ?? 24;
    const dto = await this.client.request(
      `/apps${query.toString() ? `?${query}` : ""}`,
      PaginatedAppsDtoSchema,
      { tags: ["apps"], ...options },
    );
    return mapPaginatedApps(dto, perPage);
  }

  /** A single app by id or slug. `null` when OmniSource does not know it. */
  async get(id: string, options: RequestOptions = {}): Promise<App | null> {
    const dto = await this.client.request(
      `/apps/${encodeURIComponent(id)}`,
      AppDtoSchema,
      { tags: ["apps", `app:${id}`], revalidate: 120, ...options },
    );
    return mapApp(dto);
  }

  /** OmniSource trending — popularity signals computed upstream. */
  async trending(options: RequestOptions = {}): Promise<App[]> {
    const dto = await this.client.request("/trending", TrendingSchema, {
      tags: ["trending"],
      revalidate: 600,
      ...options,
    });
    return dto.map(mapApp);
  }

  /** Recently released / updated apps, newest first. */
  async recent(options: RequestOptions = {}): Promise<App[]> {
    const dto = await this.client.request("/latest", LatestSchema, {
      tags: ["latest"],
      revalidate: 300,
      ...options,
    });
    return dto.map(mapApp);
  }

  /** Most popular apps by OmniSource popularity score. */
  async popular(limit = 12, options: RequestOptions = {}) {
    return this.list({ sort: "popularity", perPage: limit }, options);
  }

  /** Highest-trust apps in the catalog. */
  async trusted(limit = 12, options: RequestOptions = {}) {
    return this.list({ sort: "trust", perPage: limit }, options);
  }

  /** Catalog-wide statistics from OmniSource. */
  async stats(options: RequestOptions = {}): Promise<CatalogStats> {
    const dto = await this.client.request("/stats", StatsSchema, {
      tags: ["stats"],
      revalidate: 600,
      ...options,
    });
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
}
