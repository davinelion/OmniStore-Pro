/**
 * Search endpoint group — GET /api/v1/search.
 *
 * OmniSource owns the search engine (indexing, ranking, typo tolerance,
 * semantic blending). OmniStore ships NO local index and NO ranking code;
 * it forwards queries and renders validated results.
 */

import {
  PaginatedAppsDtoSchema,
  mapPaginatedApps,
  mapApp,
  type App,
} from "@omnistore/shared-models";
import type { OmniSourceClient, RequestOptions } from "./client";
import { filtersToSearchParams } from "./params";
import type { AppListParams } from "./apps";

export type SearchParams = Omit<AppListParams, "sort"> & { sort?: string };

export class SearchApi {
  constructor(private readonly client: OmniSourceClient) {}

  /**
   * Full catalog search. `sort` defaults to "relevance" upstream, which is
   * the engine's own ranking — OmniStore never re-ranks results.
   */
  async query(params: SearchParams = {}, options: RequestOptions = {}) {
    const search = filtersToSearchParams({ sort: "relevance", ...params });
    const perPage = params.perPage ?? 24;
    const dto = await this.client.request(
      `/search${search.toString() ? `?${search}` : ""}`,
      PaginatedAppsDtoSchema,
      { tags: ["search"], revalidate: 60, ...options },
    );
    return mapPaginatedApps(dto, perPage);
  }

  /** Lightweight type-ahead suggestions from the same engine. */
  async suggestions(text: string, limit = 8, options: RequestOptions = {}): Promise<App[]> {
    const query = filtersToSearchParams({ q: text, per_page: limit });
    const dto = await this.client.request(`/search?${query}`, PaginatedAppsDtoSchema, {
      revalidate: 60,
      ...options,
    });
    return dto.items.map(mapApp);
  }
}
