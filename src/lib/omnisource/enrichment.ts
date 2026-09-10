import { z } from "zod";
import {
  SafeUrlSchema,
  PlatformSchema,
  type App,
} from "@/lib/schemas/omnisource";

export const ScreenshotEvidenceSchema = z.object({
  url: SafeUrlSchema,
  alt: z.string().min(1).max(300),
  source_url: SafeUrlSchema,
  attribution: z.string().min(1).max(300),
  permission: z.string().min(1).max(500),
});
export const InstallRecipeSchema = z
  .object({
    platform: PlatformSchema,
    manager: z.enum(["winget", "brew", "flatpak", "snap"]),
    package_id: z
      .string()
      .min(1)
      .max(150)
      .regex(/^[A-Za-z0-9][A-Za-z0-9._+/-]*$/),
    source_url: SafeUrlSchema,
  })
  .refine(
    (r) =>
      ({ winget: "windows", brew: "macos", flatpak: "linux", snap: "linux" })[
        r.manager
      ] === r.platform,
    "Package manager/platform mismatch",
  );
export const EnrichmentSchema = z.object({
  repository: z.string().regex(/^[\w.-]+\/[\w.-]+$/),
  evidence_url: SafeUrlSchema,
  reviewed_at: z.string().datetime(),
  screenshots: z.array(ScreenshotEvidenceSchema).max(12).default([]),
  features: z.array(z.string().min(1).max(300)).max(30).default([]),
  installation: z.array(InstallRecipeSchema).max(10).default([]),
});
export const EnrichmentsSchema = z
  .array(EnrichmentSchema)
  .max(10000)
  .refine(
    (rows) =>
      new Set(rows.map((r) => r.repository.toLowerCase())).size === rows.length,
    "Duplicate repository enrichment",
  );
export type Enrichment = z.infer<typeof EnrichmentSchema>;
export function publishedSha256(digest?: string | null): string | null {
  return digest && /^sha256:[a-f0-9]{64}$/i.test(digest)
    ? digest.slice(7).toLowerCase()
    : null;
}
export function installCommand(
  recipe: z.infer<typeof InstallRecipeSchema>,
): string {
  const r = InstallRecipeSchema.parse(recipe);
  const prefix = {
    winget: "winget install --exact --id",
    brew: "brew install",
    flatpak: "flatpak install flathub",
    snap: "snap install",
  }[r.manager];
  return `${prefix} ${r.package_id}`;
}
export function enrichApp(app: App, evidence?: Enrichment): App {
  if (!evidence) return app;
  if (app.source.repo?.toLowerCase() !== evidence.repository.toLowerCase())
    throw new Error("Enrichment repository mismatch");
  return {
    ...app,
    screenshots: evidence.screenshots,
    features: evidence.features.length ? evidence.features : app.features,
    installation: evidence.installation,
    metadata_evidence: {
      url: evidence.evidence_url,
      reviewed_at: evidence.reviewed_at,
    },
  };
}
