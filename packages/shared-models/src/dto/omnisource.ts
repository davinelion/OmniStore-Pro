/**
 * OmniSource REST API v1 wire DTOs + mappers.
 *
 * The DTO *types* are inferred from the zod schemas in ../schemas — the
 * schema is the single source of truth for the wire contract. Client code
 * never touches DTOs directly — `mapApp` and friends turn validated wire
 * data into domain models. One mapper layer, no duplicated metadata.
 */

import type {
  App,
  Architecture,
  AssetStatus,
  Category,
  Collection,
  Developer,
  DeveloperProfile,
  Platform,
  PlatformInfo,
  RecommendationItem,
  RecommendationKind,
  RecommendationResponse,
  Release,
  ReleaseAsset,
  TrustBadge,
  TrustFactors,
  TrustReport,
  SecurityReport,
  SecurityScanEvidence,
} from "../models";
import type {
  AppDto,
  AssetDto,
  CategoryDto,
  CollectionDto,
  DeveloperRecordDto,
  PaginatedAppsDto,
  PlatformInfoDto,
  RecommendationResponseDto,
  ReleaseDto,
  SecurityResponse,
  StatsDto,
  TrustResponse,
} from "../schemas";

export type {
  AppDto,
  AssetDto,
  CategoryDto,
  CollectionDto,
  DeveloperDto,
  DeveloperRecordDto,
  PaginatedAppsDto,
  PaginatedCollectionsDto,
  PlatformInfoDto,
  RecommendationItemDto,
  RecommendationResponseDto,
  ReleaseDto,
  ScoresDto,
  SecurityResponse,
  SecurityScanDto,
  StatsDto,
  TrustResponse,
} from "../schemas";

/* ------------------------------------------------------------------ */
/* Mappers — the ONLY place wire data becomes domain models            */
/* ------------------------------------------------------------------ */

const PLATFORMS: readonly Platform[] = ["ios", "ipados", "android", "windows", "macos", "linux"];

function toPlatform(value: string | undefined | null): Platform | null {
  return value && (PLATFORMS as readonly string[]).includes(value) ? (value as Platform) : null;
}

function toArchitecture(value: string | undefined | null): Architecture | null {
  if (!value) return null;
  return ["arm64", "x86_64", "x86", "universal", "universal2", "armv7", "any"].includes(value)
    ? (value as Architecture)
    : "any";
}

function toAssetStatus(value: string | undefined | null): AssetStatus {
  return value === "VALID" ||
    value === "INVALID" ||
    value === "QUARANTINED" ||
    value === "REVIEW_REQUIRED"
    ? value
    : "UNKNOWN";
}

export function mapAsset(dto: AssetDto): ReleaseAsset {
  return {
    id: dto.id,
    platform: toPlatform(dto.platform),
    architecture: toArchitecture(dto.architecture),
    packageType: dto.package_type,
    version: dto.version,
    url: dto.url,
    sizeBytes: dto.size_bytes ?? null,
    sha256: dto.sha256 ?? null,
    source: dto.source ?? null,
    status: toAssetStatus(dto.status),
  };
}

export function mapRelease(dto: ReleaseDto): Release {
  return {
    version: dto.version,
    releasedAt: dto.released_at ?? null,
    notes: dto.notes ?? null,
    assets: Array.isArray(dto.assets) ? dto.assets.map(mapAsset) : [],
    hasBreakingChanges: Boolean(dto.has_breaking_changes),
  };
}

/** Bundle id: upstream identity when the repository URL exposes it. */
function bundleId(dto: AppDto): string {
  const repo = dto.repository;
  if (repo) {
    try {
      const url = new URL(repo);
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts.length >= 2) {
        const owner = parts[0]!;
        const name = parts[1]!.replace(/\.git$/, "");
        const host = url.hostname.replace(/^www\./, "");
        if (host === "github.com" || host === "gitlab.com" || host === "codeberg.org") {
          return `${host.split(".")[0]}:${owner}/${name}`;
        }
      }
    } catch {
      /* fall through to slug */
    }
  }
  return dto.id ?? dto.slug;
}

export function mapApp(dto: AppDto): App {
  const screenshots = (dto.screenshots ?? []).filter((s) => typeof s === "string" && s.length > 0);
  const releases = Array.isArray(dto.releases) ? dto.releases.map(mapRelease) : [];
  const categories = dto.categories ?? [];
  return {
    id: dto.id,
    name: dto.name,
    slug: dto.slug,
    bundleId: bundleId(dto),
    version: dto.latest_release?.version ?? null,
    description: dto.description?.trim() || dto.short_description?.trim() || "",
    icon: dto.icon ?? null,
    banner: screenshots[0] ?? null,
    screenshots,
    developer: dto.developer?.name ?? "",
    developerId: dto.developer?.id ?? null,
    category: categories[0] ?? "",
    tags: dto.tags ?? [],
    trustScore: dto.scores?.trust ?? null,
    securityScore: null, // only the security endpoint owns this number
    popularityScore: dto.scores?.popularity ?? null,
    downloadCount: null, // OmniSource v1 does not expose per-app downloads
    source: dto.source_name ?? null,
    homepage: dto.homepage ?? null,
    repository: dto.repository ?? null,
    updatedAt: dto.updated_at ?? null,
    shortDescription: dto.short_description ?? null,
    features: dto.features ?? [],
    categories,
    platforms: (dto.platforms ?? [])
      .map((p) => toPlatform(p))
      .filter((p): p is Platform => p !== null),
    license: dto.license ?? null,
    openSource: dto.open_source ?? true,
    activeDevelopment: dto.active_development ?? null,
    documentation: dto.documentation ?? null,
    createdAt: dto.created_at ?? null,
    qualityScore: dto.scores?.quality ?? null,
    latestRelease: dto.latest_release ? mapRelease(dto.latest_release) : null,
    releases,
    similar: dto.similar ?? [],
    alternatives: dto.alternatives ?? [],
  };
}

export function mapPaginatedApps(dto: PaginatedAppsDto, perPage = 30) {
  const total = dto.total ?? 0;
  const page = dto.page ?? 1;
  return {
    items: dto.items.map(mapApp),
    pagination: {
      page,
      perPage,
      total,
      totalPages: perPage > 0 ? Math.max(1, Math.ceil(total / perPage)) : 0,
    },
    freshness: dto.freshness ?? null,
  };
}

export function mapCollection(dto: CollectionDto): Collection {
  return {
    id: dto.id,
    slug: dto.slug,
    name: dto.name,
    description: dto.description ?? "",
    isPublic: dto.is_public ?? true,
    itemCount: dto.item_count ?? dto.items?.length ?? 0,
    createdAt: dto.created_at ?? null,
    updatedAt: dto.updated_at ?? null,
    apps: dto.items ? dto.items.map(mapApp) : undefined,
  };
}

export function mapCategory(dto: CategoryDto & { app_count?: number | null }): Category {
  return {
    id: dto.slug || dto.category_type,
    slug: dto.slug || dto.category_type,
    name: dto.name,
    description: dto.description ?? "",
    icon: dto.icon ?? null,
    appCount: dto.app_count ?? 0,
  };
}

export function mapDeveloper(dto: DeveloperRecordDto): Developer {
  return {
    id: dto.developer_id,
    slug: dto.slug,
    name: dto.display_name || dto.name,
    url: null,
  };
}

type DeveloperAppsPayload =
  | { items: AppDto[]; total: number; page?: number | null }
  | AppDto[];

export function mapDeveloperProfile(
  developer: DeveloperRecordDto,
  payload: { apps: DeveloperAppsPayload; platforms?: string[] },
): DeveloperProfile {
  const apps = Array.isArray(payload.apps)
    ? payload.apps.map(mapApp)
    : payload.apps.items.map(mapApp);
  return {
    ...mapDeveloper(developer),
    apps,
    platforms: payload.platforms ?? [],
    categories: [...new Set(apps.map((a) => a.category).filter(Boolean))],
    appCount: Array.isArray(payload.apps) ? payload.apps.length : payload.apps.total,
  };
}

const TRUST_BADGE_VALUES: readonly TrustBadge[] = [
  "verified",
  "trusted",
  "security_audited",
  "community_verified",
  "experimental",
  "deprecated",
];

export function mapTrust(dto: TrustResponse): TrustReport {
  const factors: TrustFactors = {};
  for (const [key, value] of Object.entries(dto.factors ?? {})) {
    const n = Number(value);
    if (Number.isFinite(n)) factors[key] = n;
  }
  const badges = (dto.badges ?? []).filter((badge): badge is TrustBadge =>
    (TRUST_BADGE_VALUES as readonly string[]).includes(badge),
  );
  return {
    appId: dto.app_id,
    score: dto.score ?? null,
    factors,
    badges,
    calculatedAt: dto.calculated_at ?? null,
  };
}

export function mapSecurity(dto: SecurityResponse): SecurityReport {
  const scans: SecurityScanEvidence[] = (dto.scans ?? []).map((scan) => ({
    type: scan.type,
    status: scan.status,
    severity: scan.severity ?? null,
    confidence: scan.confidence ?? null,
    findings: scan.findings ?? [],
    vulnerabilities: scan.vulnerabilities ?? [],
    scannedAt: scan.scanned_at ?? null,
    scannerVersion: scan.scanner_version ?? null,
  }));
  return {
    appId: dto.app_id,
    securityScore: dto.security_score,
    riskScore: dto.risk_score,
    status: dto.status,
    latestScannedAt: dto.latest_scanned_at ?? null,
    scans,
  };
}

const RECOMMENDATION_KINDS: readonly RecommendationKind[] = [
  "similar",
  "alternative",
  "collaborative",
  "category",
  "developer",
  "trending",
  "popular",
  "new",
];

export function mapRecommendations(dto: RecommendationResponseDto): RecommendationResponse {
  return {
    subjectAppId: dto.subject_app_id ?? null,
    algorithmVersion: dto.algorithm_version ?? "v1",
    generatedAt: dto.generated_at,
    items: (dto.items ?? [])
      .filter((item) => item.app != null)
      .map((item) => ({
        app: mapApp(item.app),
        score: item.score,
        kind: (RECOMMENDATION_KINDS as readonly string[]).includes(item.kind)
          ? (item.kind as RecommendationKind)
          : "similar",
        reasons: item.reasons ?? [],
      })),
  };
}

export function mapStats(dto: StatsDto) {
  return {
    apps: dto.applications ?? dto.total_apps ?? 0,
    releases: dto.releases ?? 0,
    assets: dto.assets ?? 0,
    repositories: dto.repositories ?? 0,
    sources: dto.sources ?? 0,
    platforms: dto.platforms ?? 0,
    categories: dto.categories ?? 0,
    downloads: dto.total_downloads ?? null,
  };
}

export function mapPlatformInfo(dto: PlatformInfoDto): PlatformInfo {
  return {
    id: dto.platform_type,
    slug: dto.platform_type,
    name: dto.name,
    displayName: dto.display_name || dto.name,
    icon: dto.icon ?? null,
    appCount: 0,
  };
}
