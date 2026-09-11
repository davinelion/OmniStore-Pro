import { z } from "zod";
import { nullable } from "./common";
import { AppDtoSchema } from "./app";

export const TrustResponseSchema = z.object({
  app_id: z.string(),
  score: z.number().min(0).max(100).nullable().optional(),
  factors: z.record(z.number()).nullable().optional(),
  badges: z.array(z.string()).catch([]).default([]),
  calculated_at: nullable(z.string()),
});

export const SecurityScanDtoSchema = z.object({
  type: z.string(),
  status: z.string(),
  severity: nullable(z.string()),
  confidence: z.number().nullable().optional(),
  findings: z.array(z.unknown()).catch([]).default([]),
  vulnerabilities: z.array(z.unknown()).catch([]).default([]),
  scanned_at: nullable(z.string()),
  scanner_version: nullable(z.string()),
});

export const SecurityResponseSchema = z.object({
  app_id: z.string(),
  security_score: z.number().min(0).max(100),
  risk_score: z.number().min(0).max(100),
  status: z.string(),
  latest_scanned_at: nullable(z.string()),
  scans: z.array(SecurityScanDtoSchema).catch([]).default([]),
});

export const RecommendationItemSchema = z.object({
  app: AppDtoSchema,
  score: z.number().min(0).max(1).catch(0),
  kind: z.string().catch("similar"),
  reasons: z.array(z.string()).catch([]).default([]),
});

export const RecommendationResponseSchema = z.object({
  subject_app_id: nullable(z.string()),
  algorithm_version: z.string().catch("v1"),
  generated_at: z.string(),
  items: z.array(RecommendationItemSchema).catch([]).default([]),
});

export const StatsDtoSchema = z.object({
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

export type TrustResponse = z.infer<typeof TrustResponseSchema>;
export type SecurityScanDto = z.infer<typeof SecurityScanDtoSchema>;
export type SecurityResponse = z.infer<typeof SecurityResponseSchema>;
export type RecommendationItemDto = z.infer<typeof RecommendationItemSchema>;
export type RecommendationResponseDto = z.infer<typeof RecommendationResponseSchema>;
export type StatsDto = z.infer<typeof StatsDtoSchema>;
