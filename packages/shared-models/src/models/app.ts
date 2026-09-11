/**
 * The OmniStore App model — the single application shape used by every
 * screen of every client. Mapped from the OmniSource wire DTO by
 * `dtoToApp` (see ../dto/omnisource). Never redefined per screen.
 */

export type Platform =
  | "ios"
  | "ipados"
  | "android"
  | "windows"
  | "macos"
  | "linux";

export type Architecture =
  | "arm64"
  | "x86_64"
  | "x86"
  | "universal"
  | "universal2"
  | "armv7"
  | "any";

/** Validation verdict OmniSource has issued for a downloadable artifact. */
export type AssetStatus =
  | "VALID"
  | "INVALID"
  | "QUARANTINED"
  | "REVIEW_REQUIRED"
  | "UNKNOWN";

export interface ReleaseAsset {
  id: string;
  platform: Platform | null;
  architecture: Architecture | null;
  packageType: string;
  version: string;
  url: string;
  sizeBytes: number | null;
  sha256: string | null;
  source: string | null;
  status: AssetStatus;
}

export interface Release {
  version: string;
  releasedAt: string | null;
  notes: string | null;
  assets: ReleaseAsset[];
  hasBreakingChanges: boolean;
}

export interface AppScores {
  trust: number | null;
  quality: number | null;
  popularity: number | null;
  trustFactors: string[];
  qualityFactors: string[];
}

/**
 * The canonical App model.
 *
 * Identity fields (id, name, slug) are always present. Data fields are
 * nullable when OmniSource has no data — the UI renders "Not available",
 * it never invents values (see docs/HONESTY.md in the web client).
 */
export interface App {
  id: string;
  name: string;
  slug: string;
  /** Upstream package identity, e.g. "github:localsend/localsend" or an F-Droid/Flatpak id. */
  bundleId: string;
  /** Latest release version, or null when no release is published. */
  version: string | null;
  description: string;
  icon: string | null;
  /** Best available wide visual (first screenshot) used for hero treatments. */
  banner: string | null;
  screenshots: string[];
  developer: string;
  developerId: string | null;
  /** Primary category slug. */
  category: string;
  tags: string[];
  trustScore: number | null;
  securityScore: number | null;
  popularityScore: number | null;
  downloadCount: number | null;
  /** Source platform the app was indexed from (e.g. "GitHub"). */
  source: string | null;
  homepage: string | null;
  repository: string | null;
  updatedAt: string | null;

  /* ---- additional normalized OmniSource data (optional) ---- */
  shortDescription?: string | null;
  features?: string[];
  categories?: string[];
  platforms?: Platform[];
  license?: string | null;
  openSource?: boolean;
  activeDevelopment?: boolean | null;
  documentation?: string | null;
  createdAt?: string | null;
  qualityScore?: number | null;
  latestRelease?: Release | null;
  /** Newer-first release history (may be truncated by the API). */
  releases?: Release[];
  similar?: string[];
  alternatives?: string[];
}

/** Sort orders accepted by the apps list and search endpoints. */
export type AppSort = "relevance" | "popularity" | "updated" | "newest" | "name" | "trust";
