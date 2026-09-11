/**
 * Categories + platforms endpoint groups — GET /api/v1/categories, /platforms.
 * The taxonomy is owned by OmniSource; clients render it.
 */

import {
  CategoryDtoSchema,
  PlatformInfoDtoSchema,
  mapCategory,
  mapPlatformInfo,
  type Category,
  type PlatformInfo,
} from "@omnistore/shared-models";
import { z } from "zod";
import type { OmniSourceClient, RequestOptions } from "./client";

const CategoryListSchema = z.array(CategoryDtoSchema);
const PlatformListSchema = z.array(PlatformInfoDtoSchema);

const CategoryDetailSchema = CategoryDtoSchema.extend({
  app_count: z.number().catch(0).optional(),
});

export class CategoriesApi {
  constructor(private readonly client: OmniSourceClient) {}

  /** Full category taxonomy. */
  async list(options: RequestOptions = {}): Promise<Category[]> {
    const dto = await this.client.request("/categories", CategoryListSchema, {
      tags: ["categories"],
      revalidate: 1800,
      ...options,
    });
    return dto.map(mapCategory);
  }

  /** One category record (flat v1 payload). App lists come from /apps?category=. */
  async get(slug: string, options: RequestOptions = {}) {
    const dto = await this.client.request(
      `/categories/${encodeURIComponent(slug)}`,
      CategoryDetailSchema,
      { tags: ["categories", `category:${slug}`], ...options },
    );
    return { category: mapCategory(dto), apps: null };
  }

  /** Platform taxonomy (for filters and badges). */
  async platforms(options: RequestOptions = {}): Promise<PlatformInfo[]> {
    const dto = await this.client.request("/platforms", PlatformListSchema, {
      tags: ["platforms"],
      revalidate: 1800,
      ...options,
    });
    return dto.map(mapPlatformInfo);
  }
}
