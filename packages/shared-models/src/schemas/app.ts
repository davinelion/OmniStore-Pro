import { z } from "zod";
import { nullable, urlSchema } from "./common";

const platformEnum = z.enum(["ios", "ipados", "android", "windows", "macos", "linux"]);
const architectureEnum = z.enum([
  "arm64",
  "x86_64",
  "x86",
  "universal",
  "universal2",
  "armv7",
  "any",
]);

export const AssetDtoSchema = z.object({
  id: z.string(),
  platform: z.string(),
  architecture: z.string(),
  package_type: z.string(),
  version: z.string(),
  url: z.string(),
  size_bytes: z.number().nullable().optional(),
  sha256: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  status: z.string().optional(),
});

export const ReleaseDtoSchema = z.object({
  version: z.string(),
  released_at: nullable(z.string()),
  notes: nullable(z.string()),
  assets: z.array(AssetDtoSchema).catch([]).default([]),
  has_breaking_changes: z.boolean().nullable().optional(),
});

export const DeveloperDtoSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  url: nullable(z.string()),
});

export const ScoresDtoSchema = z.object({
  trust: z.number().min(0).max(100).nullable().optional(),
  quality: z.number().min(0).max(100).nullable().optional(),
  popularity: z.number().min(0).max(100).nullable().optional(),
  trust_factors: z.array(z.string()).nullable().optional(),
  quality_factors: z.array(z.string()).nullable().optional(),
});

/** The OmniSource v1 app payload. Validated before it ever reaches the UI. */
export const AppDtoSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  short_description: nullable(z.string()),
  description: nullable(z.string()),
  features: z.array(z.string()).nullable().optional(),
  developer: DeveloperDtoSchema.nullable().optional(),
  categories: z.array(z.string()).catch([]).default([]),
  tags: z.array(z.string()).catch([]).default([]),
  platforms: z.array(z.string()).catch([]).default([]),
  license: nullable(z.string()),
  homepage: urlSchema,
  repository: urlSchema,
  documentation: urlSchema,
  icon: urlSchema,
  screenshots: z.array(z.string()).catch([]).default([]),
  scores: ScoresDtoSchema.nullable().optional(),
  latest_release: ReleaseDtoSchema.nullable().optional(),
  releases: z.array(ReleaseDtoSchema).catch([]).default([]),
  alternatives: z.array(z.string()).catch([]).default([]),
  similar: z.array(z.string()).catch([]).default([]),
  source_name: nullable(z.string()),
  source_status: nullable(z.string()),
  updated_at: nullable(z.string()),
  created_at: nullable(z.string()),
  open_source: z.boolean().nullable().optional(),
  active_development: z.boolean().nullable().optional(),
});

export const PaginatedAppsDtoSchema = z.object({
  items: z.array(AppDtoSchema).catch([]).default([]),
  total: z.number().catch(0),
  page: z.number().nullable().optional(),
  freshness: nullable(z.string()),
});

export type AssetDto = z.infer<typeof AssetDtoSchema>;
export type ReleaseDto = z.infer<typeof ReleaseDtoSchema>;
export type DeveloperDto = z.infer<typeof DeveloperDtoSchema>;
export type ScoresDto = z.infer<typeof ScoresDtoSchema>;
export type AppDto = z.infer<typeof AppDtoSchema>;
export type PaginatedAppsDto = z.infer<typeof PaginatedAppsDtoSchema>;
export { platformEnum, architectureEnum };
