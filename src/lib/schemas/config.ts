import { z } from "zod";

/** Payload served by /api/v1/config so the client can read flags without a rebuild. */
export const FeatureFlagsSchema = z.object({
  comparison: z.boolean(),
  favorites: z.boolean(),
  collections: z.boolean(),
  reporting: z.boolean(),
  pwa: z.boolean(),
  aiRecommendations: z.boolean(),
  i18n: z.boolean(),
});

export type FeatureFlagsPayload = z.infer<typeof FeatureFlagsSchema>;

export const ReportSchema = z.object({
  appId: z.string().min(1).max(200).optional(),
  appName: z.string().min(1).max(200).optional(),
  reason: z.enum([
    "Broken download",
    "Incorrect metadata",
    "Wrong platform",
    "Incorrect version",
    "Duplicate app",
    "License issue",
    "Security concern",
    "Other",
  ]),
  details: z.string().max(4000).optional(),
  contact: z.string().max(320).optional(),
});

export type ReportPayload = z.infer<typeof ReportSchema>;
