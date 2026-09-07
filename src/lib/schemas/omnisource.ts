import { z } from "zod";

export const PlatformSchema = z.enum([
  "ios",
  "ipados",
  "android",
  "windows",
  "macos",
  "linux",
]);

export const ArchitectureSchema = z.enum([
  "arm64",
  "x86_64",
  "x86",
  "universal",
  "any",
]);

export const AssetStatusSchema = z.enum([
  "VALID",
  "INVALID",
  "QUARANTINED",
  "REVIEW_REQUIRED",
  "UNKNOWN",
]);

export const AssetSchema = z.object({
  id: z.string(),
  platform: PlatformSchema,
  architecture: ArchitectureSchema,
  package_type: z.string(),
  version: z.string(),
  size_bytes: z.number().optional(),
  sha256: z.string().optional(),
  source: z.string().optional(),
  url: z.string().url(),
  status: AssetStatusSchema.default("UNKNOWN"),
});

export const ReleaseSchema = z.object({
  version: z.string(),
  released_at: z.string().optional(),
  notes: z.string().optional(),
  assets: z.array(AssetSchema).default([]),
});

export const ScoresSchema = z.object({
  trust: z.number().min(0).max(100).optional(),
  quality: z.number().min(0).max(100).optional(),
  popularity: z.number().min(0).max(100).optional(),
  trust_factors: z.array(z.string()).optional(),
  quality_factors: z.array(z.string()).optional(),
});

export const DeveloperSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  url: z.string().url().optional(),
});

export const AppSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  short_description: z.string().optional(),
  description: z.string().optional(),
  features: z.array(z.string()).optional(),
  developer: DeveloperSchema.optional(),
  categories: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  platforms: z.array(PlatformSchema).default([]),
  license: z.string().optional(),
  homepage: z.string().url().optional(),
  repository: z.string().url().optional(),
  documentation: z.string().url().optional(),
  icon: z.string().optional(),
  screenshots: z.array(z.string()).default([]),
  scores: ScoresSchema.optional(),
  latest_release: ReleaseSchema.optional(),
  releases: z.array(ReleaseSchema).default([]),
  alternatives: z.array(z.string()).default([]),
  similar: z.array(z.string()).default([]),
  source_name: z.string().optional(),
  source_status: z.string().optional(),
  updated_at: z.string().optional(),
  created_at: z.string().optional(),
  open_source: z.boolean().default(true),
  active_development: z.boolean().optional(),
});

export const CategorySchema = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string().optional(),
});

export const PaginatedAppsSchema = z.object({
  items: z.array(AppSchema),
  total: z.number(),
  page: z.number().optional(),
  freshness: z.string().optional(),
});

export type Platform = z.infer<typeof PlatformSchema>;
export type Architecture = z.infer<typeof ArchitectureSchema>;
export type Asset = z.infer<typeof AssetSchema>;
export type Release = z.infer<typeof ReleaseSchema>;
export type App = z.infer<typeof AppSchema>;
export type Developer = z.infer<typeof DeveloperSchema>;
export type Category = z.infer<typeof CategorySchema>;
