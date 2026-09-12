#!/usr/bin/env node
/**
 * Mock OmniSource API v1 server for local/E2E use.
 *
 * Serves a small, deterministic catalog that satisfies the same zod
 * contracts the real OmniSource backend enforces (packages/shared-models).
 * No network calls, no state — fully hermetic for Playwright runs.
 *
 * Usage: node scripts/mock-omnisource.mjs [--port 8007]
 */

import { createServer } from "node:http";

const PORT = Number(
  process.argv.includes("--port")
    ? process.argv[process.argv.indexOf("--port") + 1]
    : process.env.MOCK_PORT ?? 8007,
);

const NOW = "2026-09-10T12:00:00Z";

/* ------------------------------------------------------------------ */
/* Fixtures                                                            */
/* ------------------------------------------------------------------ */

const DEVELOPERS = {
  "localsend-org": { developer_id: "localsend-org", slug: "localsend-org", name: "LocalSend Team", display_name: "LocalSend Team" },
  joplin: { developer_id: "joplin", slug: "joplin", name: "Joplin", display_name: "Joplin" },
  "keepassxc-org": { developer_id: "keepassxc-org", slug: "keepassxc-org", name: "KeePassXC Team", display_name: "KeePassXC Team" },
  rustdesk: { developer_id: "rustdesk", slug: "rustdesk", name: "RustDesk", display_name: "RustDesk" },
  bitwarden: { developer_id: "bitwarden", slug: "bitwarden", name: "Bitwarden", display_name: "Bitwarden" },
  audacity: { developer_id: "audacity", slug: "audacity", name: "Audacity Team", display_name: "Audacity Team" },
  "beem-development": { developer_id: "beem-development", slug: "beem-development", name: "Beem Development", display_name: "Beem Development" },
  gnome: { developer_id: "gnome", slug: "gnome", name: "The GNOME Project", display_name: "The GNOME Project" },
  inkscape: { developer_id: "inkscape", slug: "inkscape", name: "Inkscape", display_name: "Inkscape" },
  forgejo: { developer_id: "forgejo", slug: "forgejo", name: "Forgejo Contributors", display_name: "Forgejo Contributors" },
  obsproject: { developer_id: "obsproject", slug: "obsproject", name: "OBS Project", display_name: "OBS Project" },
  ffmpeg: { developer_id: "ffmpeg", slug: "ffmpeg", name: "FFmpeg", display_name: "FFmpeg" },
  microsoft: { developer_id: "microsoft", slug: "microsoft", name: "Microsoft", display_name: "Microsoft" },
  simplemobiletools: { developer_id: "simplemobiletools", slug: "simplemobiletools", name: "Simple Mobile Tools", display_name: "Simple Mobile Tools" },
};

/* Package shapes per platform — mirrors the artefacts real projects publish. */
const PLATFORM_PACKAGES = {
  android: [
    { package_type: "apk", architecture: "arm64", ext: "apk", size: 24_500_000 },
    { package_type: "apk", architecture: "x86_64", ext: "apk", size: 26_100_000 },
  ],
  ios: [{ package_type: "ipa", architecture: "arm64", ext: "ipa", size: 41_200_000 }],
  windows: [
    { package_type: "msi", architecture: "x86_64", ext: "msi", size: 62_400_000 },
    { package_type: "exe", architecture: "arm64", ext: "exe", size: 64_800_000 },
  ],
  macos: [
    { package_type: "dmg", architecture: "arm64", ext: "dmg", size: 78_300_000 },
    { package_type: "dmg", architecture: "universal", ext: "dmg", size: 132_000_000 },
  ],
  linux: [
    { package_type: "appimage", architecture: "x86_64", ext: "AppImage", size: 98_000_000 },
    { package_type: "deb", architecture: "x86_64", ext: "deb", size: 21_400_000 },
  ],
};

function buildAssets(slug, downloadBase, version, platforms, unverifiedPlatform = null) {
  const assets = [];
  for (const platform of platforms) {
    for (const spec of PLATFORM_PACKAGES[platform] ?? []) {
      const filename = `${slug}-${version}-${spec.architecture}.${spec.ext}`;
      assets.push({
        id: `${slug}-${platform}-${spec.package_type}-${spec.architecture}`,
        platform,
        architecture: spec.architecture,
        package_type: spec.package_type,
        version,
        url: `${downloadBase}/releases/download/v${version}/${filename}`,
        size_bytes: spec.size,
        sha256: (spec.package_type + slug).padEnd(64, "0").slice(0, 64),
        source: `${slug}_release`,
        // One platform can hold an unvalidated artefact — the UI must show the
        // real status rather than silently offering it as a download.
        status: platform === unverifiedPlatform ? "REVIEW_REQUIRED" : "VALID",
      });
    }
  }
  return assets;
}

function buildReleases(version, releasedAt, notes) {
  const [major, minor, patch] = version.split(".").map(Number);
  const base = new Date(releasedAt).getTime();
  const history = [
    { version, released_at: releasedAt, notes, has_breaking_changes: false },
    {
      version: `${major}.${Math.max(0, minor - 1)}.${patch}`,
      released_at: new Date(base - 82 * 86400000).toISOString(),
      notes: "Feature release with performance work and translations.",
      has_breaking_changes: false,
    },
    {
      version: `${major}.${Math.max(0, minor - 2)}.0`,
      released_at: new Date(base - 168 * 86400000).toISOString(),
      notes: "Major release. See the upgrade notes before updating.",
      has_breaking_changes: true,
    },
    {
      version: `${Math.max(0, major - 1)}.9.${patch}`,
      released_at: new Date(base - 260 * 86400000).toISOString(),
      notes: "Maintenance release.",
      has_breaking_changes: false,
    },
  ];
  return history;
}

function app(config) {
  const {
    slug,
    name,
    summary,
    description,
    category,
    platforms,
    developerId,
    scores,
    license,
    repo,
    sourceName = "GitHub",
    version = "2.1.0",
    releasedAt = "2026-09-01T10:00:00Z",
    notes = "Stable release with sync improvements and bug fixes.",
    unverifiedPlatform = null,
    features,
    extraTags = [],
  } = config;

  const developer = DEVELOPERS[developerId];
  const assets = buildAssets(slug, repo, version, platforms, unverifiedPlatform);
  const releases = buildReleases(version, releasedAt, notes).map((release) => ({
    ...release,
    assets: release.version === version ? assets : [],
  }));

  return {
    id: slug,
    slug,
    name,
    short_description: summary,
    description,
    features: features ?? ["Cross-platform", "Open source", "No account required"],
    developer: {
      id: developerId,
      slug: developer.slug,
      name: developer.name,
      url: `https://${slug}.example.org`,
    },
    categories: [category],
    tags: [category, "open-source", ...extraTags],
    platforms,
    license,
    homepage: `https://${slug}.example.org`,
    repository: repo,
    documentation: `https://${slug}.example.org/docs`,
    icon: null,
    screenshots: [],
    scores: {
      trust: scores[0],
      quality: scores[1],
      popularity: scores[2],
      trust_factors: ["open_source_license", "validated_assets"],
    },
    latest_release: {
      version,
      released_at: releasedAt,
      notes,
      has_breaking_changes: false,
      assets,
    },
    releases,
    alternatives: [],
    similar: [],
    source_name: sourceName,
    source_status: "HEALTHY",
    updated_at: releasedAt,
    created_at: "2021-04-15T10:00:00Z",
    open_source: true,
    active_development: true,
  };
}

const APPS = [
  app({
    slug: "localsend",
    name: "LocalSend",
    summary: "Share files to nearby devices",
    description:
      "LocalSend is a free, open-source cross-platform app to share files and messages with nearby devices over the local network — an alternative to AirDrop.",
    category: "utilities",
    platforms: ["android", "windows", "macos", "linux"],
    developerId: "localsend-org",
    scores: [94, 90, 88],
    license: "Apache-2.0",
    repo: "https://github.com/localsend/localsend",
    version: "1.17.0",
    releasedAt: "2026-09-04T09:20:00Z",
    notes: "Faster transfer handshake, new device nicknames, and 12 new translations.",
    extraTags: ["file-transfer", "lan"],
  }),
  app({
    slug: "joplin",
    name: "Joplin",
    summary: "Notes and to-do lists with sync",
    description:
      "Joplin is a privacy-focused note taking and to-do application with markdown support and end-to-end encrypted sync.",
    category: "productivity",
    platforms: ["android", "windows", "macos", "linux"],
    developerId: "joplin",
    scores: [91, 89, 84],
    license: "AGPL-3.0",
    repo: "https://github.com/laurent22/joplin",
    version: "3.4.12",
    releasedAt: "2026-08-28T14:05:00Z",
    notes: "Improved editor performance on large notebooks and a refreshed sync UI.",
    extraTags: ["notes", "markdown", "e2ee"],
  }),
  app({
    slug: "keepassxc",
    name: "KeePassXC",
    summary: "Cross-platform password manager",
    description:
      "KeePassXC is a modern, secure, and open-source password manager that stores and manages your most sensitive information locally.",
    category: "security",
    platforms: ["windows", "macos", "linux"],
    developerId: "keepassxc-org",
    scores: [96, 92, 80],
    license: "GPL-3.0",
    repo: "https://github.com/keepassxreboot/keepassxc",
    version: "2.7.10",
    releasedAt: "2026-09-08T11:00:00Z",
    notes: "Security hardening, KDBX4 import fixes and better browser integration.",
    extraTags: ["passwords", "offline"],
  }),
  app({
    slug: "rustdesk",
    name: "RustDesk",
    summary: "Open-source remote desktop",
    description:
      "RustDesk is an open-source remote desktop application designed for self-hosting, as an alternative to TeamViewer.",
    category: "utilities",
    platforms: ["android", "windows", "macos", "linux"],
    developerId: "rustdesk",
    scores: [88, 85, 86],
    license: "AGPL-3.0",
    repo: "https://github.com/rustdesk/rustdesk",
    version: "1.4.2",
    releasedAt: "2026-09-02T16:40:00Z",
    notes: "Lower-latency video pipeline and a rebuilt address book.",
    extraTags: ["remote-desktop", "self-hosted"],
  }),
  app({
    slug: "bitwarden",
    name: "Bitwarden",
    summary: "Password manager with vault sync",
    description:
      "Bitwarden is an open-source password manager that keeps your vault encrypted end to end and syncs it across every device.",
    category: "security",
    platforms: ["android", "ios", "windows", "macos", "linux"],
    developerId: "bitwarden",
    scores: [93, 91, 95],
    license: "GPL-3.0",
    repo: "https://github.com/bitwarden/clients",
    version: "2026.8.1",
    releasedAt: "2026-09-06T08:15:00Z",
    notes: "Passkey improvements, faster vault unlock and accessibility fixes.",
    extraTags: ["passwords", "passkeys"],
  }),
  app({
    slug: "audacity",
    name: "Audacity",
    summary: "Record and edit audio",
    description:
      "Audacity is a free, open-source, cross-platform audio editor used for recording, mixing and mastering tracks.",
    category: "multimedia",
    platforms: ["windows", "macos", "linux"],
    developerId: "audacity",
    scores: [87, 84, 82],
    license: "GPL-3.0",
    repo: "https://github.com/audacity/audacity",
    version: "3.7.4",
    releasedAt: "2026-08-19T12:00:00Z",
    notes: "New compressor, faster spectrogram rendering and plugin stability fixes.",
    unverifiedPlatform: "macos",
    extraTags: ["audio", "editor"],
  }),
  app({
    slug: "aegis-authenticator",
    name: "Aegis Authenticator",
    summary: "Two-factor codes, offline",
    description:
      "Aegis is a free, secure and open-source two-factor authentication app for Android that keeps your codes encrypted on device.",
    category: "security",
    platforms: ["android"],
    developerId: "beem-development",
    scores: [95, 93, 71],
    license: "GPL-3.0",
    repo: "https://github.com/beemdevelopment/Aegis",
    version: "3.3.1",
    releasedAt: "2026-07-30T10:30:00Z",
    notes: "Encrypted export improvements and Material You theming.",
    extraTags: ["2fa", "otp"],
  }),
  app({
    slug: "gimp",
    name: "GIMP",
    summary: "GNU image manipulation program",
    description:
      "GIMP is a cross-platform image editor for photo retouching, image composition and image authoring.",
    category: "graphics",
    platforms: ["windows", "macos", "linux"],
    developerId: "gnome",
    scores: [90, 88, 79],
    license: "GPL-3.0",
    repo: "https://gitlab.gnome.org/GNOME/gimp",
    sourceName: "GitLab",
    version: "3.1.2",
    releasedAt: "2026-08-11T09:00:00Z",
    notes: "Non-destructive filters, faster canvas rendering and HiDPI fixes.",
    extraTags: ["image", "photo"],
  }),
  app({
    slug: "inkscape",
    name: "Inkscape",
    summary: "Professional vector graphics editor",
    description:
      "Inkscape is an open-source vector graphics editor for illustrations, icons, logos, diagrams and complex artwork.",
    category: "graphics",
    platforms: ["windows", "macos", "linux"],
    developerId: "inkscape",
    scores: [89, 87, 76],
    license: "GPL-3.0",
    repo: "https://gitlab.com/inkscape/inkscape",
    sourceName: "GitLab",
    version: "1.4.2",
    releasedAt: "2026-09-01T13:45:00Z",
    notes: "Improved path effects, SVG2 support and a rewritten export dialog.",
    extraTags: ["svg", "vector"],
  }),
  app({
    slug: "forgejo",
    name: "Forgejo",
    summary: "Self-hosted git forge",
    description:
      "Forgejo is a self-hosted lightweight software forge with git hosting, issue tracking, pull requests and CI.",
    category: "development",
    platforms: ["linux", "windows"],
    developerId: "forgejo",
    scores: [92, 90, 68],
    license: "GPL-3.0",
    repo: "https://codeberg.org/forgejo/forgejo",
    sourceName: "Codeberg",
    version: "11.0.1",
    releasedAt: "2026-09-09T07:30:00Z",
    notes: "Actions runner improvements, faster repository indexing and security fixes.",
    extraTags: ["git", "self-hosted"],
  }),
  app({
    slug: "obs-studio",
    name: "OBS Studio",
    summary: "Live streaming and screen recording",
    description:
      "OBS Studio is free and open-source software for video recording and live streaming, with real-time source and device capture.",
    category: "multimedia",
    platforms: ["windows", "macos", "linux"],
    developerId: "obsproject",
    scores: [91, 89, 93],
    license: "GPL-2.0",
    repo: "https://flathub.org/apps/com.obsproject.Studio",
    sourceName: "Flathub",
    version: "31.0.3",
    releasedAt: "2026-08-25T15:10:00Z",
    notes: "New hybrid MP4 recording, AV1 encoder presets and plugin API additions.",
    extraTags: ["streaming", "recording"],
  }),
  app({
    slug: "ffmpeg",
    name: "FFmpeg",
    summary: "Record, convert and stream media",
    description:
      "FFmpeg is a complete, cross-platform solution to record, convert and stream audio and video, with a powerful command line interface.",
    category: "multimedia",
    platforms: ["macos", "linux", "windows"],
    developerId: "ffmpeg",
    scores: [94, 96, 97],
    license: "LGPL-2.1",
    repo: "https://formulae.brew.sh/formula/ffmpeg",
    sourceName: "Homebrew",
    version: "8.0.1",
    releasedAt: "2026-09-05T10:00:00Z",
    notes: "New codecs, faster hardware decode paths and security patches.",
    extraTags: ["video", "cli"],
  }),
  app({
    slug: "powertoys",
    name: "PowerToys",
    summary: "Windows power-user utilities",
    description:
      "Microsoft PowerToys is a set of utilities for power users to tune and streamline Windows for greater productivity.",
    category: "utilities",
    platforms: ["windows"],
    developerId: "microsoft",
    scores: [90, 88, 92],
    license: "MIT",
    repo: "https://github.com/microsoft/PowerToys",
    sourceName: "Winget",
    version: "0.94.1",
    releasedAt: "2026-09-07T18:00:00Z",
    notes: "New Command Palette plugins, improved Peek and registry preview fixes.",
    extraTags: ["windows", "productivity"],
  }),
  app({
    slug: "simple-gallery",
    name: "Simple Gallery",
    summary: "Offline photo gallery",
    description:
      "A gallery app for viewing and organising photos and videos, with no ads, no trackers and full offline operation.",
    category: "multimedia",
    platforms: ["android"],
    developerId: "simplemobiletools",
    scores: [86, 83, 64],
    license: "GPL-3.0",
    repo: "https://f-droid.org/packages/com.simplemobiletools.gallery.pro",
    sourceName: "F-Droid",
    version: "6.32.4",
    releasedAt: "2026-08-14T09:25:00Z",
    notes: "Faster thumbnail generation, better EXIF handling and crash fixes.",
    extraTags: ["photos", "offline"],
  }),
];

/* Relationship graph for the recommendation engine responses. */
const bySlugSafe = (slug) => APPS.find((a) => a.slug === slug || a.id === slug) ?? null;
bySlugSafe("localsend").similar = ["rustdesk", "joplin"];
bySlugSafe("localsend").alternatives = ["rustdesk"];
bySlugSafe("joplin").similar = ["bitwarden", "keepassxc"];
bySlugSafe("keepassxc").similar = ["bitwarden", "aegis-authenticator"];
bySlugSafe("keepassxc").alternatives = ["bitwarden"];
bySlugSafe("rustdesk").similar = ["localsend", "obs-studio"];
bySlugSafe("rustdesk").alternatives = ["localsend"];
bySlugSafe("bitwarden").similar = ["keepassxc", "aegis-authenticator"];
bySlugSafe("bitwarden").alternatives = ["keepassxc"];
bySlugSafe("audacity").similar = ["ffmpeg", "obs-studio"];
bySlugSafe("aegis-authenticator").similar = ["keepassxc", "bitwarden"];
bySlugSafe("gimp").similar = ["inkscape", "obs-studio"];
bySlugSafe("inkscape").similar = ["gimp"];
bySlugSafe("forgejo").similar = ["localsend"];
bySlugSafe("obs-studio").similar = ["ffmpeg", "audacity"];
bySlugSafe("ffmpeg").similar = ["obs-studio", "audacity"];
bySlugSafe("powertoys").similar = ["localsend"];
bySlugSafe("simple-gallery").similar = ["audacity"];

const COLLECTIONS = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    slug: "featured",
    name: "Featured",
    description: "Hand-picked essentials the editors highlight this week.",
    appSlugs: ["localsend", "keepassxc", "joplin", "bitwarden"],
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    slug: "privacy-first",
    name: "Privacy First",
    description: "Apps that respect your data and never phone home.",
    appSlugs: ["keepassxc", "bitwarden", "aegis-authenticator", "rustdesk"],
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    slug: "creative-studio",
    name: "Creative Studio",
    description: "Everything you need to make images, audio and video.",
    appSlugs: ["gimp", "inkscape", "audacity", "obs-studio", "ffmpeg"],
  },
  {
    id: "00000000-0000-4000-8000-000000000004",
    slug: "self-hosted",
    name: "Self-hosted",
    description: "Run your own infrastructure without a vendor in the middle.",
    appSlugs: ["forgejo", "rustdesk", "bitwarden"],
  },
  {
    id: "00000000-0000-4000-8000-000000000005",
    slug: "android-essentials",
    name: "Android Essentials",
    description: "The open-source apps worth installing first on a new phone.",
    appSlugs: ["localsend", "aegis-authenticator", "simple-gallery", "joplin", "bitwarden"],
  },
];

const CATEGORIES = [
  { category_type: "utilities", slug: "utilities", name: "Utilities", description: "Everyday tools and helpers.", icon: "wrench", sort_order: 1 },
  { category_type: "productivity", slug: "productivity", name: "Productivity", description: "Notes, tasks and office apps.", icon: "check", sort_order: 2 },
  { category_type: "security", slug: "security", name: "Security", description: "Password managers and privacy tools.", icon: "shield", sort_order: 3 },
  { category_type: "graphics", slug: "graphics", name: "Graphics", description: "Image and vector editors.", icon: "palette", sort_order: 4 },
  { category_type: "multimedia", slug: "multimedia", name: "Multimedia", description: "Audio, video and streaming tools.", icon: "play", sort_order: 5 },
  { category_type: "development", slug: "development", name: "Development", description: "Forge, editor and build tooling.", icon: "code", sort_order: 6 },
];

const PLATFORMS = [
  { platform_type: "android", name: "Android", display_name: "Android", icon: "android" },
  { platform_type: "ios", name: "iOS", display_name: "iOS", icon: "ios" },
  { platform_type: "windows", name: "Windows", display_name: "Windows", icon: "windows" },
  { platform_type: "macos", name: "macOS", display_name: "macOS", icon: "macos" },
  { platform_type: "linux", name: "Linux", display_name: "Linux", icon: "linux" },
];



/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function bySlug(slug) {
  return APPS.find((a) => a.slug === slug || a.id === slug) ?? null;
}

function withItems(collection) {
  return {
    id: collection.id,
    slug: collection.slug,
    name: collection.name,
    description: collection.description,
    is_public: true,
    item_count: collection.appSlugs.length,
    created_at: NOW,
    updated_at: NOW,
    items: collection.appSlugs.map((slug) => bySlug(slug)).filter(Boolean),
  };
}

function collectionSummary(collection) {
  const { appSlugs, ...rest } = collection;
  return { ...rest, is_public: true, item_count: appSlugs.length, created_at: NOW, updated_at: NOW };
}

function paginate(items, query) {
  const page = Math.max(1, Number.parseInt(query.get("page") ?? "1", 10) || 1);
  const perPage = Math.min(100, Number.parseInt(query.get("per_page") ?? "30", 10) || 30);
  return {
    items: items.slice((page - 1) * perPage, page * perPage),
    total: items.length,
    page,
    freshness: NOW,
  };
}

function matchesQuery(entry, q) {
  if (!q) return true;
  const needle = q.toLowerCase();
  return (
    entry.name.toLowerCase().includes(needle) ||
    (entry.short_description ?? "").toLowerCase().includes(needle) ||
    entry.tags.some((tag) => tag.includes(needle))
  );
}

function recommendationItem(targetApp, score, kind, reasons) {
  return { app: targetApp, score, kind, reasons };
}

function recommendationsFor(slug, kind, limit) {
  const subject = bySlug(slug);
  const graph = kind === "similar" ? (subject?.similar ?? []) : [...(subject?.similar ?? []), ...(subject?.alternatives ?? [])];
  const seen = new Set();
  const related = graph
    .map((targetSlug) => bySlug(targetSlug))
    .filter((target) => {
      if (!target || seen.has(target.id)) return false;
      seen.add(target.id);
      return true;
    });
  // Top up with the rest of the catalog so the row never renders empty.
  for (const candidate of APPS) {
    if (related.length >= Math.max(3, limit ?? 8)) break;
    if (!seen.has(candidate.id) && candidate.id !== subject?.id) {
      seen.add(candidate.id);
      related.push(candidate);
    }
  }
  return {
    subject_app_id: subject?.id ?? null,
    algorithm_version: "v1",
    generated_at: NOW,
    items: related.slice(0, limit ?? 8).map((target, index) =>
      recommendationItem(
        target,
        Math.max(0.4, 0.95 - index * 0.1),
        kind === "similar" ? "similar" : index < (subject?.similar.length ?? 0) ? "similar" : "alternative",
        [`Popular in ${target.categories[0]}`, "Similar tag profile"],
      ),
    ),
  };
}

function trustFor(slug) {
  const subject = bySlug(slug);
  if (!subject) return null;
  return {
    app_id: subject.id,
    score: subject.scores.trust,
    factors: {
      open_source_license: 1,
      validated_assets: 0.95,
      recent_releases: 0.9,
      active_repository: 0.85,
      established_contributors: 0.8,
    },
    badges: subject.scores.trust >= 90 ? ["verified", "trusted", "community_verified"] : ["verified", "community_verified"],
    calculated_at: NOW,
  };
}

function securityFor(slug) {
  const subject = bySlug(slug);
  if (!subject) return null;
  const score = Math.min(100, (subject.scores.trust ?? 80) + 2);
  return {
    app_id: subject.id,
    security_score: score,
    risk_score: Math.max(0, 100 - score),
    status: "passed",
    latest_scanned_at: NOW,
    scans: [
      {
        type: "metadata_integrity",
        status: "passed",
        severity: null,
        confidence: 0.97,
        findings: [],
        vulnerabilities: [],
        scanned_at: NOW,
        scanner_version: "1.0.0",
      },
      {
        type: "vulnerability_scan",
        status: "passed",
        severity: null,
        confidence: 0.95,
        findings: [],
        vulnerabilities: [],
        scanned_at: NOW,
        scanner_version: "1.0.0",
      },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Server                                                              */
/* ------------------------------------------------------------------ */

const server = createServer((request, response) => {
  const url = new URL(request.url, `http://127.0.0.1:${PORT}`);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const query = url.searchParams;
  const send = (status, body, type = "application/json") => {
    const payload = typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body);
    response.writeHead(status, { "content-type": type });
    response.end(payload);
  };

  try {
    // Health (both the SDK's /../health and the plain path)
    if (path === "/health" || path === "/api/v1/health") {
      return send(200, { status: "ok", timestamp: NOW });
    }

    if (path === "/api/v1/stats") {
      const releases = APPS.reduce((sum, entry) => sum + entry.releases.length + 1, 0);
      const assets = APPS.reduce((sum, entry) => sum + entry.latest_release.assets.length, 0);
      return send(200, {
        applications: APPS.length,
        total_apps: APPS.length,
        repositories: APPS.length,
        releases,
        assets,
        sources: new Set(APPS.map((entry) => entry.source_name)).size,
        platforms: PLATFORMS.length,
        categories: CATEGORIES.length,
        total_downloads: null,
      });
    }

    if (path === "/api/v1/apps" || path === "/api/v1/search") {
      let items = [...APPS];
      const q = query.get("q");
      if (path === "/api/v1/search") items = items.filter((entry) => matchesQuery(entry, q));
      else if (q) items = items.filter((entry) => matchesQuery(entry, q));
      const category = query.get("category");
      if (category) items = items.filter((entry) => entry.categories.includes(category));
      const platform = query.get("platform");
      if (platform) items = items.filter((entry) => entry.platforms.includes(platform));
      const developer = query.get("developer");
      if (developer) items = items.filter((entry) => entry.developer?.slug === developer || entry.developer?.id === developer);
      const minTrust = Number.parseInt(query.get("min_trust") ?? "", 10);
      if (Number.isFinite(minTrust)) items = items.filter((entry) => (entry.scores?.trust ?? 0) >= minTrust);

      const sort = query.get("sort") ?? (path === "/api/v1/search" ? "relevance" : "popularity");
      if (sort === "name") items.sort((a, b) => a.name.localeCompare(b.name));
      else if (sort === "updated") items.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
      else if (sort === "newest") items.sort((a, b) => b.created_at.localeCompare(a.created_at));
      else if (sort === "trust") items.sort((a, b) => (b.scores?.trust ?? 0) - (a.scores?.trust ?? 0));
      else if (sort === "popularity") items.sort((a, b) => (b.scores?.popularity ?? 0) - (a.scores?.popularity ?? 0));

      return send(200, paginate(items, query));
    }

    if (path.startsWith("/api/v1/apps/")) {
      const slug = decodeURIComponent(path.split("/")[4] ?? "");
      const subject = bySlug(slug);
      return subject ? send(200, subject) : send(404, { detail: "Not Found" });
    }

    if (path === "/api/v1/trending") return send(200, [...APPS].sort((a, b) => (b.scores.popularity ?? 0) - (a.scores.popularity ?? 0)));
    if (path === "/api/v1/latest") {
      return send(200, [...APPS].sort((a, b) => b.updated_at.localeCompare(a.updated_at)));
    }

    if (path === "/api/v1/categories") return send(200, CATEGORIES);
    if (path.startsWith("/api/v1/categories/")) {
      const slug = decodeURIComponent(path.split("/")[4] ?? "");
      const category = CATEGORIES.find((entry) => entry.slug === slug);
      if (!category) return send(404, { detail: "Not Found" });
      return send(200, {
        ...category,
        app_count: APPS.filter((entry) => entry.categories.includes(slug)).length,
      });
    }

    if (path === "/api/v1/platforms") return send(200, PLATFORMS);

    if (path === "/api/v1/developers") {
      const list = Object.values(DEVELOPERS).map((developer) => ({
        ...developer,
        app_count: APPS.filter((entry) => entry.developer?.slug === developer.slug).length,
      }));
      return send(200, list);
    }
    if (path.startsWith("/api/v1/developers/")) {
      const slug = decodeURIComponent(path.split("/")[4] ?? "");
      const developer = DEVELOPERS[slug];
      if (!developer) return send(404, { detail: "Not Found" });
      return send(200, {
        ...developer,
        app_count: APPS.filter((entry) => entry.developer?.slug === slug).length,
      });
    }

    if (path === "/api/v1/collections") {
      const items = COLLECTIONS.map(collectionSummary);
      return send(200, { items, total: items.length, page: 1, per_page: Number.parseInt(query.get("per_page") ?? "30", 10) || 30 });
    }
    if (path.startsWith("/api/v1/collections/")) {
      const key = decodeURIComponent(path.split("/")[4] ?? "");
      const collection = COLLECTIONS.find((entry) => entry.id === key || entry.slug === key);
      return collection ? send(200, withItems(collection)) : send(404, { detail: "Not Found" });
    }

    if (path === "/api/v1/recommendations") {
      const slug = query.get("app_id") ?? query.get("slug") ?? "";
      if (!bySlug(slug)) return send(404, { detail: "Not Found" });
      return send(200, recommendationsFor(slug, "all", Number.parseInt(query.get("limit") ?? "12", 10) || 12));
    }
    if (path === "/api/v1/recommendations/similar") {
      const slug = query.get("app_id") ?? "";
      if (!bySlug(slug)) return send(404, { detail: "Not Found" });
      return send(200, recommendationsFor(slug, "similar", Number.parseInt(query.get("limit") ?? "8", 10) || 8));
    }
    if (path === "/api/v1/recommendations/trending") {
      const limit = Number.parseInt(query.get("limit") ?? "8", 10) || 8;
      return send(200, {
        subject_app_id: null,
        algorithm_version: "v1",
        generated_at: NOW,
        items: [...APPS]
          .sort((a, b) => (b.scores.popularity ?? 0) - (a.scores.popularity ?? 0))
          .slice(0, limit)
          .map((entry, index) => recommendationItem(entry, 0.9 - index * 0.05, "trending", ["Trending this week"])),
      });
    }
    if (path === "/api/v1/recommendations/discover") {
      const limit = Number.parseInt(query.get("limit") ?? "12", 10) || 12;
      const category = query.get("category");
      let items = APPS.filter((entry) => !category || entry.categories.includes(category));
      const sort = query.get("sort") ?? "new";
      items = [...items].sort((a, b) =>
        sort === "popular" ? (b.scores.popularity ?? 0) - (a.scores.popularity ?? 0) : b.updated_at.localeCompare(a.updated_at),
      );
      return send(200, {
        subject_app_id: null,
        algorithm_version: "v1",
        generated_at: NOW,
        items: items.slice(0, limit).map((entry, index) =>
          recommendationItem(entry, 0.9 - index * 0.05, sort === "popular" ? "popular" : "new", ["Recently updated"]),
        ),
      });
    }

    if (path.startsWith("/api/v1/trust/")) {
      const report = trustFor(decodeURIComponent(path.split("/")[4] ?? ""));
      return report ? send(200, report) : send(404, { detail: "Not Found" });
    }
    if (path.startsWith("/api/v1/security/")) {
      const report = securityFor(decodeURIComponent(path.split("/")[4] ?? ""));
      return report ? send(200, report) : send(404, { detail: "Not Found" });
    }

    return send(404, { detail: "Not Found" });
  } catch (error) {
    return send(500, { detail: "mock error", message: String(error) });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[mock-omnisource] listening on http://127.0.0.1:${PORT}/api/v1`);
});
