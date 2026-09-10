/**
 * OmniSource API v1 — frontend-facing contract.
 *
 * This file is the single source of truth for the OmniStore <-> OmniSource contract.
 * Every client (Web, future iOS/Android/Windows/macOS/Linux) must consume these shapes.
 *
 * Rules:
 *  - The web UI never infers `platform`, `architecture` or `package_type`.
 *    Normalisation happens in the OmniSource data pipeline (see src/lib/omnisource/normalize.ts),
 *    which is the OmniSource-side adapter, not presentation code.
 *  - Unknown upstream fields are stripped, never trusted, never rendered raw.
 *  - Absent data is modelled as `null` / `[]` and rendered as "Not available".
 */

import { z } from "zod";

export const OMNI_API_VERSION = "1";

/* ------------------------------------------------------------------ */
/* Enums                                                               */
/* ------------------------------------------------------------------ */

export const PLATFORM_IDS = ["ios", "ipados", "android", "windows", "macos", "linux"] as const;
export const PlatformSchema = z.enum(PLATFORM_IDS);

export const ARCHITECTURE_IDS = ["arm64", "arm", "x86_64", "x86", "universal", "any"] as const;
export const ArchitectureSchema = z.enum(ARCHITECTURE_IDS);

export const PACKAGE_TYPE_IDS = [
  "APK",
  "AAB",
  "IPA",
  "EXE",
  "MSI",
  "MSIX",
  "PORTABLE",
  "DMG",
  "PKG",
  "APPIMAGE",
  "DEB",
  "RPM",
  "FLATPAK",
  "SNAP",
  "TAR",
  "ZIP",
  "SOURCE",
  "OTHER",
] as const;
export const PackageTypeSchema = z.enum(PACKAGE_TYPE_IDS);

/**
 * Asset validation state as reported by OmniSource.
 * Only `VALID` assets are presented as normal downloads.
 */
export const ASSET_STATUS_IDS = [
  "VALID",
  "INVALID",
  "QUARANTINED",
  "REVIEW_REQUIRED",
  "UNKNOWN",
] as const;
export const AssetStatusSchema = z.enum(ASSET_STATUS_IDS);

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

/** Only https is renderable as an outbound link. Normalised, never raw. */
export const SafeUrlSchema = z
  .string()
  .trim()
  .url()
  .refine((value) => {
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  }, "Only https URLs are accepted");

export const IsoDateSchema = z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/));

/* ------------------------------------------------------------------ */
/* Scores                                                              */
/* ------------------------------------------------------------------ */

export const ScoreFactorSchema = z.object({
  /** Machine key, e.g. "open_source_license". */
  key: z.string(),
  /** Human readable factor, e.g. "Open-source license". */
  label: z.string(),
  /** Whether the signal is present in the upstream data. */
  present: z.boolean(),
  /** Why, in one short sentence, this factor counts as it does. */
  detail: z.string(),
  /** Points contributed to the score, for transparency. */
  points: z.number(),
  /** Maximum points this factor could contribute. */
  max: z.number(),
});

export const ScoreSchema = z.object({
  /** 0-100, or null when OmniSource cannot compute it. */
  value: z.number().min(0).max(100).nullable(),
  factors: z.array(ScoreFactorSchema).default([]),
});

export const ScoresSchema = z.object({
  trust: ScoreSchema,
  quality: ScoreSchema,
  popularity: ScoreSchema,
  /** Algorithm identity, so clients can tell how a number was produced. */
  algorithm: z.object({
    name: z.string(),
    version: z.string(),
    computed_at: IsoDateSchema.optional(),
    /** Always shown next to the number. Never a security claim. */
    disclaimer: z.string(),
  }),
});

/* ------------------------------------------------------------------ */
/* Releases & assets                                                   */
/* ------------------------------------------------------------------ */

export const AssetSchema = z.object({
  id: z.string(),
  /** Normalised by OmniSource — the UI renders it, it never guesses it. */
  platform: PlatformSchema,
  architecture: ArchitectureSchema,
  package_type: PackageTypeSchema,
  version: z.string(),
  /** Upstream filename, useful for disambiguating splits. */
  filename: z.string().optional(),
  /** Bytes. Null when upstream does not publish it. */
  size_bytes: z.number().int().nonnegative().nullable(),
  sha256: z.string().nullable(),
  /** Where the binary physically comes from, e.g. "GitHub Release". */
  source: z.string().nullable(),
  /** Outbound download URL. Must be https to be renderable. */
  url: SafeUrlSchema,
  /** Defaults to UNKNOWN: unvalidated assets are never shown as downloads. */
  status: AssetStatusSchema.default("UNKNOWN"),
  /** Human readable validation statement shown in the download panel. */
  status_note: z.string().nullable(),
});

export const ReleaseSchema = z.object({
  id: z.string(),
  version: z.string(),
  tag: z.string().nullable(),
  name: z.string().nullable(),
  released_at: IsoDateSchema.nullable(),
  /** Markdown from upstream. Rendered only after sanitising. */
  notes: z.string().nullable(),
  prerelease: z.boolean().default(false),
  url: SafeUrlSchema.nullable(),
  assets: z.array(AssetSchema).default([]),
});

/* ------------------------------------------------------------------ */
/* Developers, licences, sources                                       */
/* ------------------------------------------------------------------ */

export const DeveloperSchema = z.object({
  /** Canonical OmniSource id — the only stable identifier. */
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  /** Upstream account kind, when the source reports one. */
  type: z.enum(["Organization", "User"]).nullable().optional(),
  url: SafeUrlSchema.nullable(),
  avatar_url: SafeUrlSchema.nullable(),
});

export const LicenseSchema = z.object({
  /** SPDX identifier when known. */
  id: z.string(),
  name: z.string(),
  url: SafeUrlSchema.nullable(),
  osi_approved: z.boolean().nullable(),
});

export const SourceSchema = z.object({
  /** Upstream host, e.g. "GitHub". */
  name: z.string(),
  /** e.g. "localsend/localsend". */
  repo: z.string().nullable(),
  url: SafeUrlSchema.nullable(),
  /** Coarse upstream health, never infrastructure internals. */
  status: z.enum(["HEALTHY", "DEGRADED", "UNKNOWN"]).default("UNKNOWN"),
  fetched_at: IsoDateSchema.nullable(),
});

/** Real, observable upstream signals. Every score is derived from these. */
export const SignalsSchema = z.object({
  stars: z.number().int().nonnegative().nullable(),
  forks: z.number().int().nonnegative().nullable(),
  open_issues: z.number().int().nonnegative().nullable(),
  watchers: z.number().int().nonnegative().nullable(),
  repo_created_at: IsoDateSchema.nullable(),
  repo_pushed_at: IsoDateSchema.nullable(),
  release_count: z.number().int().nonnegative().nullable(),
  first_release_at: IsoDateSchema.nullable(),
  last_release_at: IsoDateSchema.nullable(),
  /** Days between the two most recent releases, when computable. */
  release_cadence_days: z.number().nonnegative().nullable(),
  archived: z.boolean().nullable(),
});

export const LinksSchema = z.object({
  repository: SafeUrlSchema.nullable(),
  homepage: SafeUrlSchema.nullable(),
  documentation: SafeUrlSchema.nullable(),
  releases: SafeUrlSchema.nullable(),
  issue_tracker: SafeUrlSchema.nullable(),
});

/* ------------------------------------------------------------------ */
/* App                                                                 */
/* ------------------------------------------------------------------ */

export const AppSchema = z.object({
  /** Canonical OmniSource app id. Slugs are for navigation only. */
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  summary: z.string().nullable(),
  description: z.string().nullable(),
  features: z.array(z.string()).default([]),
  developer: DeveloperSchema.nullable(),
  categories: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  platforms: z.array(PlatformSchema).default([]),
  architectures: z.array(ArchitectureSchema).default([]),
  package_types: z.array(PackageTypeSchema).default([]),
  license: LicenseSchema.nullable(),
  open_source: z.boolean(),
  active_development: z.boolean().nullable(),
  icon_url: SafeUrlSchema.nullable(),
  /** Empty when upstream publishes none. Never fabricated. */
  screenshots: z.array(z.object({ url: SafeUrlSchema, alt: z.string().nullable(), source_url: SafeUrlSchema.optional(), attribution: z.string().optional(), permission: z.string().optional() })).default([]),
  metadata_evidence: z.object({ url: SafeUrlSchema, reviewed_at: IsoDateSchema }).optional(),
  installation: z.array(z.object({
    platform: PlatformSchema, manager: z.enum(["winget", "brew", "flatpak", "snap"]),
    package_id: z.string().min(1).max(150).regex(/^[A-Za-z0-9][A-Za-z0-9._+/-]*$/), source_url: SafeUrlSchema,
  }).refine(r => ({ winget: "windows", brew: "macos", flatpak: "linux", snap: "linux" }[r.manager]) === r.platform)).optional(),
  scores: ScoresSchema,
  signals: SignalsSchema,
  links: LinksSchema,
  source: SourceSchema,
  latest_release: ReleaseSchema.nullable(),
  /** Full history, newest first. */
  releases: z.array(ReleaseSchema).default([]),
  /** Relationship ids computed by OmniSource, not hand written. */
  alternatives: z.array(z.string()).default([]),
  similar: z.array(z.string()).default([]),
  created_at: IsoDateSchema.nullable(),
  updated_at: IsoDateSchema.nullable(),
});

/* ------------------------------------------------------------------ */
/* Collections                                                         */
/* ------------------------------------------------------------------ */

export const CategorySchema = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  app_count: z.number().int().nonnegative(),
});

export const PlatformInfoSchema = z.object({
  slug: PlatformSchema,
  name: z.string(),
  description: z.string().nullable(),
  app_count: z.number().int().nonnegative(),
  /** Install hints surfaced verbatim on app pages. */
  install_methods: z.array(z.string()).default([]),
});

export const CollectionSchema = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  /** App ids. Resolved against the catalog at render time. */
  apps: z.array(z.string()).default([]),
  /** Optional machine-generated rule (see config/collections). */
  rule: z
    .object({
      platforms: z.array(PlatformSchema).default([]),
      categories: z.array(z.string()).default([]),
      min_platforms: z.number().int().nonnegative().nullable(),
      licenses: z.array(z.string()).default([]),
      sort: z.enum(["trust", "popularity", "updated", "name"]).default("trust"),
      limit: z.number().int().positive().default(12),
    })
    .nullable(),
  curated: z.boolean().default(true),
});

/* ------------------------------------------------------------------ */
/* Envelopes                                                           */
/* ------------------------------------------------------------------ */

export const PaginationSchema = z.object({
  page: z.number().int().positive(),
  per_page: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  total_pages: z.number().int().nonnegative(),
});

export const FeedMetaSchema = z.object({
  api_version: z.literal(OMNI_API_VERSION).or(z.string()),
  generated_at: IsoDateSchema,
  /** Which OmniSource implementation produced this payload. */
  generator: z.string(),
  /** Upstream origin of the data, e.g. "github". */
  upstream: z.string(),
  app_count: z.number().int().nonnegative(),
});

export const FeedSchema = z.object({
  meta: FeedMetaSchema,
  apps: z.array(AppSchema),
  categories: z.array(CategorySchema).default([]),
  platforms: z.array(PlatformInfoSchema).default([]),
  collections: z.array(CollectionSchema).default([]),
});

export const AppListSchema = z.object({
  meta: FeedMetaSchema.optional(),
  items: z.array(AppSchema),
  pagination: PaginationSchema,
});

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type Platform = z.infer<typeof PlatformSchema>;
export type Architecture = z.infer<typeof ArchitectureSchema>;
export type PackageType = z.infer<typeof PackageTypeSchema>;
export type AssetStatus = z.infer<typeof AssetStatusSchema>;
export type Asset = z.infer<typeof AssetSchema>;
export type Release = z.infer<typeof ReleaseSchema>;
export type App = z.infer<typeof AppSchema>;
export type Developer = z.infer<typeof DeveloperSchema>;
export type License = z.infer<typeof LicenseSchema>;
export type Score = z.infer<typeof ScoreSchema>;
export type ScoreFactor = z.infer<typeof ScoreFactorSchema>;
export type Scores = z.infer<typeof ScoresSchema>;
export type Signals = z.infer<typeof SignalsSchema>;
export type Source = z.infer<typeof SourceSchema>;
export type Links = z.infer<typeof LinksSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type PlatformInfo = z.infer<typeof PlatformInfoSchema>;
export type Collection = z.infer<typeof CollectionSchema>;
export type Feed = z.infer<typeof FeedSchema>;
export type AppList = z.infer<typeof AppListSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;

/* ------------------------------------------------------------------ */
/* Download safety                                                     */
/* ------------------------------------------------------------------ */

/**
 * An asset may only be offered as a normal download when OmniSource
 * reports it as VALID. Everything else is surfaced as unavailable —
 * never as a download button.
 */
export function isDownloadableAsset(asset: Asset): boolean {
  return asset.status === "VALID";
}

export const DOWNLOADABLE_STATUSES: readonly AssetStatus[] = ["VALID"];

export function assetStatusNote(asset: Asset): string {
  switch (asset.status) {
    case "VALID":
      return asset.status_note ?? "Verified by OmniSource validation.";
    case "UNKNOWN":
      return "Verification unavailable";
    case "REVIEW_REQUIRED":
      return "This package is pending review and is not offered as a download.";
    case "QUARANTINED":
      return "This package has been quarantined upstream and is not offered as a download.";
    case "INVALID":
      return "This package failed upstream validation and is not offered as a download.";
    default:
      return "Verification unavailable";
  }
}
