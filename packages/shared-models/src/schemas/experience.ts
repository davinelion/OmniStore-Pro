import { z } from "zod";
import { nullable } from "./common";

/** Favorites API (cloud mode) — GET/POST/DELETE /api/v1/favorites */
export const FavoriteItemSchema = z.object({
  app_id: z.string(),
  app: z.unknown().optional(),
  created_at: nullable(z.string()),
});

export const PaginatedFavoritesSchema = z.object({
  items: z.array(FavoriteItemSchema).catch([]).default([]),
  total: z.number().catch(0),
  page: z.number().catch(1),
  per_page: z.number().catch(30),
});

/** User collections API (cloud mode) — /api/v1/collections */
export const CollectionMutationResponseSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: nullable(z.string()),
  is_public: z.boolean().optional(),
  item_count: z.number().optional(),
  created_at: nullable(z.string()).optional(),
  updated_at: nullable(z.string()).optional(),
  items: z.array(z.unknown()).optional(),
});

/** Analytics events — POST /api/v1/analytics/events accepts 202. */
export const AnalyticsAckSchema = z.object({ accepted: z.number().optional() }).partial();
