/**
 * Recommendations endpoint group — GET /api/v1/recommendations*.
 *
 * All recommendation intelligence (similar, alternatives, collaborative,
 * trending, discover) lives in OmniSource. OmniStore caches and renders.
 */

import {
  RecommendationResponseSchema,
  mapApp,
  mapRecommendations,
  type App,
  type RecommendationResponse,
} from "@omnistore/shared-models";
import type { OmniSourceClient, RequestOptions } from "./client";
import { filtersToSearchParams } from "./params";

export class RecommendationsApi {
  constructor(private readonly client: OmniSourceClient) {}

  /** Everything related to an app: similar + alternatives + collaborative. */
  async forApp(id: string, limit = 12, options: RequestOptions = {}): Promise<RecommendationResponse | null> {
    const query = filtersToSearchParams({ appId: id, limit });
    try {
      const dto = await this.client.request(
        `/recommendations?${query}`,
        RecommendationResponseSchema,
        { tags: ["recommendations", `app:${id}`], revalidate: 600, ...options },
      );
      return mapRecommendations(dto);
    } catch {
      // Unknown app → 404; recommendations are always optional decoration.
      return null;
    }
  }

  /** Content-based similar apps. */
  async similar(id: string, limit = 8, options: RequestOptions = {}) {
    const query = filtersToSearchParams({ appId: id, limit });
    try {
      const dto = await this.client.request(
        `/recommendations/similar?${query}`,
        RecommendationResponseSchema,
        { tags: ["recommendations", `app:${id}`], revalidate: 600, ...options },
      );
      return mapRecommendations(dto);
    } catch {
      return null;
    }
  }

  /** Catalog-wide trending picks (explainable). */
  async trending(limit = 12, options: RequestOptions = {}): Promise<App[]> {
    const query = filtersToSearchParams({ limit });
    const dto = await this.client.request(
      `/recommendations/trending?${query}`,
      RecommendationResponseSchema,
      { tags: ["recommendations"], revalidate: 600, ...options },
    );
    return mapRecommendations(dto).items.map((item) => item.app);
  }

  /** New or popular discovery, optionally inside one category. */
  async discover(params: { category?: string; sort?: "new" | "popular"; limit?: number } = {}, options: RequestOptions = {}): Promise<App[]> {
    const query = filtersToSearchParams(params);
    const dto = await this.client.request(
      `/recommendations/discover?${query}`,
      RecommendationResponseSchema,
      { tags: ["recommendations"], revalidate: 600, ...options },
    );
    return mapRecommendations(dto).items.map((item) => item.app);
  }
}
