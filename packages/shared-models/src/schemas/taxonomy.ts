import { z } from "zod";
import { nullable } from "./common";
import { AppDtoSchema } from "./app";

export const CategoryDtoSchema = z.object({
  id: z.string().nullable().optional(),
  category_type: z.string(),
  slug: z.string(),
  name: z.string(),
  description: nullable(z.string()),
  icon: nullable(z.string()),
  sort_order: z.number().optional(),
});

export const DeveloperRecordDtoSchema = z.object({
  developer_id: z.string(),
  slug: z.string(),
  name: z.string(),
  display_name: nullable(z.string()),
  email: nullable(z.string()).optional(),
});

export const PlatformInfoDtoSchema = z.object({
  platform_type: z.string(),
  name: z.string(),
  display_name: nullable(z.string()),
  icon: nullable(z.string()),
});

export const PaginatedCollectionsDtoSchema = z.object({
  items: z.array(z.unknown()).catch([]).default([]),
  total: z.number().catch(0),
  page: z.number().catch(1),
  per_page: z.number().catch(30),
});

export const CollectionDtoSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: nullable(z.string()),
  is_public: z.boolean().optional(),
  item_count: z.number().optional(),
  created_at: nullable(z.string()),
  updated_at: nullable(z.string()),
  items: z.array(AppDtoSchema).optional(),
});

/** The v1 category detail payload is the flat category record + app_count. */
export const CategoryDetailSchema = CategoryDtoSchema.extend({
  app_count: z.number().catch(0).optional(),
});

/** The v1 developer detail payload is the flat record + profile counts. */
export const DeveloperDetailSchema = DeveloperRecordDtoSchema.extend({
  app_count: z.number().catch(0).optional(),
  bio: nullable(z.string()).optional(),
  location: nullable(z.string()).optional(),
  avatar_url: nullable(z.string()).optional(),
  email: nullable(z.string()).optional(),
});

export type CategoryDto = z.infer<typeof CategoryDtoSchema>;
export type DeveloperRecordDto = z.infer<typeof DeveloperRecordDtoSchema>;
export type PlatformInfoDto = z.infer<typeof PlatformInfoDtoSchema>;
export type CollectionDto = z.infer<typeof CollectionDtoSchema>;
export type PaginatedCollectionsDto = z.infer<typeof PaginatedCollectionsDtoSchema>;
