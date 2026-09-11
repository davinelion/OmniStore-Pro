/**
 * Collections endpoint group — GET /api/v1/collections.
 *
 * Collections are assembled inside OmniSource (editorial picks, generated
 * sets, user collections). OmniStore defines no collections in code.
 */

import {
  CollectionDtoSchema,
  PaginatedCollectionsDtoSchema,
  mapCollection,
  type Collection,
} from "@omnistore/shared-models";
import { z } from "zod";
import type { OmniSourceClient, RequestOptions } from "./client";

const ListSchema = z.object({
  items: z.array(CollectionDtoSchema).catch([]).default([]),
  total: z.number().catch(0),
  page: z.number().catch(1),
  per_page: z.number().catch(30),
});

export class CollectionsApi {
  constructor(private readonly client: OmniSourceClient) {}

  /** Browse public collections. */
  async list(page = 1, perPage = 30, options: RequestOptions = {}) {
    const dto = await this.client.request(
      `/collections?page=${page}&per_page=${perPage}`,
      ListSchema,
      { tags: ["collections"], ...options },
    );
    return {
      items: dto.items.map(mapCollection),
      pagination: {
        page: dto.page,
        perPage: dto.per_page,
        total: dto.total,
        totalPages: dto.per_page > 0 ? Math.ceil(dto.total / dto.per_page) : 0,
      },
    };
  }

  /**
   * One collection with its ordered apps. `null` for unknown slugs.
   * The detail endpoint keys on the collection id, so slugs resolve through
   * the public index first (single cached lookup per page render).
   */
  async get(slug: string, options: RequestOptions = {}): Promise<Collection | null> {
    const index = await this.client.request(
      `/collections?page=1&per_page=100`,
      ListSchema,
      { tags: ["collections", `collection:${slug}`], ...options },
    );
    const summary = index.items.find((item) => item.slug === slug);
    if (!summary) return null;
    const dto = await this.client.request(
      `/collections/${encodeURIComponent(summary.id)}`,
      CollectionDtoSchema,
      { tags: ["collections", `collection:${slug}`], ...options },
    );
    return mapCollection(dto);
  }

  /** Well-known homepage collections, resolved through OmniSource only. */
  async bySlug(slug: "featured" | "trending" | "new" | "popular" | "editors-choice" | (string & {}), options?: RequestOptions) {
    return this.get(slug, options);
  }
}
