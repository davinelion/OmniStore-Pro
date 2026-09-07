/**
 * Test fixtures.
 *
 * Every fixture is built from the real OmniSource contract
 * (`src/lib/schemas/omnisource.ts`), so component tests exercise the same
 * shapes the app renders in production. Nothing here invents "nice" data —
 * absent upstream fields stay `null`, which is what the UI must survive.
 */

import type {
  App,
  Architecture,
  Asset,
  AssetStatus,
  PackageType,
  Platform,
  Release,
} from "@/lib/schemas/omnisource";

export type AssetOverrides = {
  id?: string;
  platform?: Platform;
  architecture?: Architecture;
  packageType?: PackageType;
  version?: string;
  filename?: string;
  size?: number | null;
  sha256?: string | null;
  url?: string;
  status?: AssetStatus;
  statusNote?: string | null;
};

export function buildAsset(overrides: AssetOverrides = {}): Asset {
  return {
    id: overrides.id ?? "asset-1",
    platform: overrides.platform ?? "linux",
    architecture: overrides.architecture ?? "x86_64",
    package_type: overrides.packageType ?? "APPIMAGE",
    version: overrides.version ?? "1.0.0",
    filename: overrides.filename ?? "app-1.0.0-x86_64.AppImage",
    size_bytes: overrides.size === undefined ? 12_345_678 : overrides.size,
    sha256: overrides.sha256 ?? null,
    source: "GitHub Release",
    url:
      overrides.url ??
      "https://github.com/example/app/releases/download/v1.0.0/app-1.0.0-x86_64.AppImage",
    status: overrides.status ?? "VALID",
    status_note: overrides.statusNote ?? null,
  };
}

export type ReleaseOverrides = {
  id?: string;
  version?: string;
  tag?: string | null;
  releasedAt?: string | null;
  notes?: string | null;
  prerelease?: boolean;
  url?: string | null;
  assets?: Asset[];
};

export function buildRelease(overrides: ReleaseOverrides = {}): Release {
  return {
    id: overrides.id ?? "release-1",
    version: overrides.version ?? "1.0.0",
    tag: overrides.tag ?? "v1.0.0",
    name: overrides.version ?? "1.0.0",
    released_at: overrides.releasedAt === undefined ? "2026-08-21T14:02:01Z" : overrides.releasedAt,
    notes: overrides.notes ?? null,
    prerelease: overrides.prerelease ?? false,
    url: overrides.url ?? "https://github.com/example/app/releases/tag/v1.0.0",
    assets: overrides.assets ?? [buildAsset()],
  };
}

export type AppOverrides = {
  id?: string;
  slug?: string;
  name?: string;
  summary?: string | null;
  description?: string | null;
  features?: string[];
  categories?: string[];
  tags?: string[];
  platforms?: Platform[];
  architectures?: Architecture[];
  packageTypes?: PackageType[];
  license?: App["license"];
  openSource?: boolean;
  activeDevelopment?: boolean | null;
  iconUrl?: string | null;
  screenshots?: Array<{ url: string; alt: string | null }>;
  trust?: number | null;
  quality?: number | null;
  popularity?: number | null;
  stars?: number | null;
  archived?: boolean | null;
  releaseCount?: number | null;
  lastReleaseAt?: string | null;
  links?: Partial<App["links"]>;
  latestRelease?: Release | null;
  releases?: Release[];
  alternatives?: string[];
  similar?: string[];
  updatedAt?: string | null;
  createdAt?: string | null;
  developerName?: string | null;
  developerType?: "Organization" | "User" | null;
};

export function buildApp(overrides: AppOverrides = {}): App {
  const name = overrides.name ?? "Example App";
  const id = overrides.id ?? "example-app";
  const license =
    overrides.license === undefined
      ? { id: "GPL-3.0", name: "GNU General Public License v3.0", url: "https://spdx.org/licenses/GPL-3.0.html", osi_approved: true }
      : overrides.license;

  const latest = overrides.latestRelease === undefined ? buildRelease() : overrides.latestRelease;

  return {
    id,
    slug: overrides.slug ?? id,
    name,
    summary: overrides.summary === undefined ? "An open-source app used to verify the UI." : overrides.summary,
    description:
      overrides.description === undefined
        ? "A longer description of what the app does, as published upstream."
        : overrides.description,
    features: overrides.features ?? ["Local-first", "No telemetry"],
    developer:
      overrides.developerName === null
        ? null
        : {
            id: "example",
            slug: "example",
            name: overrides.developerName ?? "Example Org",
            type: overrides.developerType ?? "Organization",
            url: "https://github.com/example",
            avatar_url: null,
          },
    categories: overrides.categories ?? ["utilities"],
    tags: overrides.tags ?? ["open-source", "privacy"],
    platforms: overrides.platforms ?? ["linux", "windows", "macos"],
    architectures: overrides.architectures ?? ["x86_64", "arm64"],
    package_types: overrides.packageTypes ?? ["APPIMAGE", "MSI", "DMG"],
    license,
    open_source: overrides.openSource ?? true,
    active_development: overrides.activeDevelopment ?? true,
    icon_url: overrides.iconUrl ?? null,
    screenshots: overrides.screenshots ?? [],
    scores: {
      trust: {
        value: overrides.trust === undefined ? 88 : overrides.trust,
        factors: [
          {
            key: "open_source_license",
            label: "Open-source license",
            present: true,
            detail: "Published under an OSI-approved license.",
            points: 20,
            max: 20,
          },
        ],
      },
      quality: {
        value: overrides.quality === undefined ? 82 : overrides.quality,
        factors: [
          {
            key: "recent_releases",
            label: "Recent releases",
            present: true,
            detail: "Last release published 18 days ago.",
            points: 25,
            max: 30,
          },
        ],
      },
      popularity: {
        value: overrides.popularity === undefined ? 74 : overrides.popularity,
        factors: [
          {
            key: "stars",
            label: "Stars",
            present: true,
            detail: "8,000 stars upstream.",
            points: 40,
            max: 60,
          },
        ],
      },
      algorithm: {
        name: "omnisource-signals",
        version: "1.0.0",
        computed_at: "2026-09-08T00:00:00Z",
        disclaimer:
          "Computed from public upstream signals such as licence, release recency and asset validation. It is not a security guarantee and not a malware scan.",
      },
    },
    signals: {
      stars: overrides.stars === undefined ? 8_000 : overrides.stars,
      forks: 640,
      open_issues: 120,
      watchers: 210,
      repo_created_at: "2019-04-02T10:00:00Z",
      repo_pushed_at: "2026-09-01T10:00:00Z",
      release_count: overrides.releaseCount === undefined ? 24 : overrides.releaseCount,
      first_release_at: "2019-06-01T10:00:00Z",
      last_release_at: overrides.lastReleaseAt === undefined ? "2026-08-21T14:02:01Z" : overrides.lastReleaseAt,
      release_cadence_days: 45,
      archived: overrides.archived ?? false,
    },
    links: {
      repository: "https://github.com/example/app",
      homepage: "https://example.org",
      documentation: null,
      releases: "https://github.com/example/app/releases",
      issue_tracker: "https://github.com/example/app/issues",
      ...overrides.links,
    },
    source: {
      name: "GitHub",
      repo: "example/app",
      url: "https://github.com/example/app",
      status: "HEALTHY",
      fetched_at: "2026-09-08T00:00:00Z",
    },
    latest_release: latest,
    releases: overrides.releases ?? (latest ? [latest] : []),
    alternatives: overrides.alternatives ?? [],
    similar: overrides.similar ?? [],
    created_at: overrides.createdAt === undefined ? "2019-04-02T10:00:00Z" : overrides.createdAt,
    updated_at: overrides.updatedAt === undefined ? "2026-09-01T10:00:00Z" : overrides.updatedAt,
  };
}

/** Two apps that are genuine alternatives (same category, different vendor). */
export function buildAppPair(): [App, App] {
  return [
    buildApp({ id: "alpha", slug: "alpha", name: "Alpha", categories: ["audio"] }),
    buildApp({ id: "beta", slug: "beta", name: "Beta", categories: ["audio"], developerName: "Other Org" }),
  ];
}
