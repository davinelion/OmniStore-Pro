/**
 * Bundled demo catalog — OmniSource v1 wire data served in-process.
 *
 * OmniStore is a client of OmniSource: normally every page renders from a live
 * OmniSource deployment (`OMNISOURCE_API_URL`). When none is configured —
 * e.g. a first Vercel deploy with zero env vars — this module supplies a
 * small, deterministic, contract-valid snapshot so the storefront is fully
 * populated out of the box instead of rendering empty shells.
 *
 * The data is real open-source software (real upstream names, licences,
 * repositories and platforms) with a curated demo release timeline. It is a
 * *snapshot*, not a live index: point `OMNISOURCE_API_URL` at a real
 * deployment to switch back to live data with no code change.
 */

import type { AppDto, AssetDto, ReleaseDto } from "@omnistore/shared-models";

export type BundledPlatform = "ios" | "ipados" | "android" | "windows" | "macos" | "linux";

interface AssetSpec {
  package_type: string;
  architecture: string;
  ext: string;
  size: number;
}

interface AppSeed {
  slug: string;
  name: string;
  summary: string;
  description: string;
  category: string;
  platforms: BundledPlatform[];
  developerId: string;
  /** [trust, quality, popularity] */
  scores: [number, number, number];
  license: string;
  repo: string;
  sourceName: string;
  version: string;
  releasedAt: string;
  notes: string;
  features?: string[];
  extraTags?: string[];
  unverifiedPlatform?: BundledPlatform | null;
}

const NOW = "2026-09-10T12:00:00Z";

/* ------------------------------------------------------------------ */
/* Developers                                                          */
/* ------------------------------------------------------------------ */

const DEVELOPERS: Record<string, { developer_id: string; slug: string; name: string; display_name: string }> = {
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
  blender: { developer_id: "blender", slug: "blender", name: "Blender Foundation", display_name: "Blender Foundation" },
  godot: { developer_id: "godot", slug: "godot", name: "Godot Engine", display_name: "Godot Engine" },
  videolan: { developer_id: "videolan", slug: "videolan", name: "VideoLAN", display_name: "VideoLAN" },
  xbmc: { developer_id: "xbmc", slug: "xbmc", name: "Kodi Foundation", display_name: "Kodi Foundation" },
  qbittorrent: { developer_id: "qbittorrent", slug: "qbittorrent", name: "qBittorrent", display_name: "qBittorrent" },
  handbrake: { developer_id: "handbrake", slug: "handbrake", name: "HandBrake Team", display_name: "HandBrake Team" },
  nextcloud: { developer_id: "nextcloud", slug: "nextcloud", name: "Nextcloud", display_name: "Nextcloud" },
  signal: { developer_id: "signal", slug: "signal", name: "Signal Foundation", display_name: "Signal Foundation" },
  standardnotes: { developer_id: "standardnotes", slug: "standardnotes", name: "Standard Notes", display_name: "Standard Notes" },
  darktable: { developer_id: "darktable", slug: "darktable", name: "darktable", display_name: "darktable" },
  dbeaver: { developer_id: "dbeaver", slug: "dbeaver", name: "DBeaver", display_name: "DBeaver" },
};

/* Package shapes per platform — mirrors the artefacts real projects publish. */
const PLATFORM_PACKAGES: Record<BundledPlatform, AssetSpec[]> = {
  android: [
    { package_type: "apk", architecture: "arm64", ext: "apk", size: 24_500_000 },
    { package_type: "apk", architecture: "x86_64", ext: "apk", size: 26_100_000 },
  ],
  ios: [{ package_type: "ipa", architecture: "arm64", ext: "ipa", size: 41_200_000 }],
  ipados: [{ package_type: "ipa", architecture: "arm64", ext: "ipa", size: 41_200_000 }],
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

function buildAssets(
  slug: string,
  downloadBase: string,
  version: string,
  platforms: BundledPlatform[],
  unverifiedPlatform: BundledPlatform | null,
): AssetDto[] {
  const assets: AssetDto[] = [];
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
        status: platform === unverifiedPlatform ? "REVIEW_REQUIRED" : "VALID",
      });
    }
  }
  return assets;
}

function buildReleases(version: string, releasedAt: string, notes: string, assets: AssetDto[]): ReleaseDto[] {
  const [major, minor, patch] = version.split(".").map(Number);
  const base = new Date(releasedAt).getTime();
  return [
    { version, released_at: releasedAt, notes, assets, has_breaking_changes: false },
    {
      version: `${major}.${Math.max(0, minor - 1)}.${patch}`,
      released_at: new Date(base - 82 * 86400000).toISOString(),
      notes: "Feature release with performance work and translations.",
      assets: [],
      has_breaking_changes: false,
    },
    {
      version: `${major}.${Math.max(0, minor - 2)}.0`,
      released_at: new Date(base - 168 * 86400000).toISOString(),
      notes: "Major release. See the upgrade notes before updating.",
      assets: [],
      has_breaking_changes: true,
    },
    {
      version: `${Math.max(0, major - 1)}.9.${patch}`,
      released_at: new Date(base - 260 * 86400000).toISOString(),
      notes: "Maintenance release.",
      assets: [],
      has_breaking_changes: false,
    },
  ];
}

function makeApp(seed: AppSeed): AppDto {
  const developer = DEVELOPERS[seed.developerId]!;
  const assets = buildAssets(seed.slug, seed.repo, seed.version, seed.platforms, seed.unverifiedPlatform ?? null);
  const releases = buildReleases(seed.version, seed.releasedAt, seed.notes, assets);

  return {
    id: seed.slug,
    slug: seed.slug,
    name: seed.name,
    short_description: seed.summary,
    description: seed.description,
    features: seed.features ?? ["Cross-platform", "Open source", "No account required"],
    developer: {
      id: developer.developer_id,
      slug: developer.slug,
      name: developer.name,
      url: `https://${seed.slug}.example.org`,
    },
    categories: [seed.category],
    tags: [seed.category, "open-source", ...(seed.extraTags ?? [])],
    platforms: seed.platforms,
    license: seed.license,
    homepage: `https://${seed.slug}.example.org`,
    repository: seed.repo,
    documentation: `https://${seed.slug}.example.org/docs`,
    icon: null,
    screenshots: [],
    scores: {
      trust: seed.scores[0],
      quality: seed.scores[1],
      popularity: seed.scores[2],
      trust_factors: ["open_source_license", "validated_assets"],
    },
    latest_release: {
      version: seed.version,
      released_at: seed.releasedAt,
      notes: seed.notes,
      has_breaking_changes: false,
      assets,
    },
    releases,
    alternatives: [],
    similar: [],
    source_name: seed.sourceName,
    source_status: "HEALTHY",
    updated_at: seed.releasedAt,
    created_at: "2021-04-15T10:00:00Z",
    open_source: true,
    active_development: true,
  };
}

/* ------------------------------------------------------------------ */
/* The catalog                                                         */
/* ------------------------------------------------------------------ */

const APPS = [
  makeApp({
    slug: "localsend", name: "LocalSend", summary: "Share files to nearby devices",
    description:
      "LocalSend is a free, open-source cross-platform app to share files and messages with nearby devices over the local network — an alternative to AirDrop.",
    category: "utilities", platforms: ["android", "windows", "macos", "linux"], developerId: "localsend-org",
    scores: [94, 90, 88], license: "Apache-2.0", repo: "https://github.com/localsend/localsend", sourceName: "GitHub",
    version: "1.17.0", releasedAt: "2026-09-04T09:20:00Z",
    notes: "Faster transfer handshake, new device nicknames, and 12 new translations.",
    extraTags: ["file-transfer", "lan"],
  }),
  makeApp({
    slug: "joplin", name: "Joplin", summary: "Notes and to-do lists with sync",
    description:
      "Joplin is a privacy-focused note taking and to-do application with markdown support and end-to-end encrypted sync.",
    category: "productivity", platforms: ["android", "windows", "macos", "linux"], developerId: "joplin",
    scores: [91, 89, 84], license: "AGPL-3.0", repo: "https://github.com/laurent22/joplin", sourceName: "GitHub",
    version: "3.4.12", releasedAt: "2026-08-28T14:05:00Z",
    notes: "Improved editor performance on large notebooks and a refreshed sync UI.",
    extraTags: ["notes", "markdown", "e2ee"],
  }),
  makeApp({
    slug: "keepassxc", name: "KeePassXC", summary: "Cross-platform password manager",
    description:
      "KeePassXC is a modern, secure, and open-source password manager that stores and manages your most sensitive information locally.",
    category: "security", platforms: ["windows", "macos", "linux"], developerId: "keepassxc-org",
    scores: [96, 92, 80], license: "GPL-3.0", repo: "https://github.com/keepassxreboot/keepassxc", sourceName: "GitHub",
    version: "2.7.10", releasedAt: "2026-09-08T11:00:00Z",
    notes: "Security hardening, KDBX4 import fixes and better browser integration.",
    extraTags: ["passwords", "offline"],
  }),
  makeApp({
    slug: "rustdesk", name: "RustDesk", summary: "Open-source remote desktop",
    description:
      "RustDesk is an open-source remote desktop application designed for self-hosting, as an alternative to TeamViewer.",
    category: "utilities", platforms: ["android", "windows", "macos", "linux"], developerId: "rustdesk",
    scores: [88, 85, 86], license: "AGPL-3.0", repo: "https://github.com/rustdesk/rustdesk", sourceName: "GitHub",
    version: "1.4.2", releasedAt: "2026-09-02T16:40:00Z",
    notes: "Lower-latency video pipeline and a rebuilt address book.",
    extraTags: ["remote-desktop", "self-hosted"],
  }),
  makeApp({
    slug: "bitwarden", name: "Bitwarden", summary: "Password manager with vault sync",
    description:
      "Bitwarden is an open-source password manager that keeps your vault encrypted end to end and syncs it across every device.",
    category: "security", platforms: ["android", "ios", "windows", "macos", "linux"], developerId: "bitwarden",
    scores: [93, 91, 95], license: "GPL-3.0", repo: "https://github.com/bitwarden/clients", sourceName: "GitHub",
    version: "2026.8.1", releasedAt: "2026-09-06T08:15:00Z",
    notes: "Passkey improvements, faster vault unlock and accessibility fixes.",
    extraTags: ["passwords", "passkeys"],
  }),
  makeApp({
    slug: "audacity", name: "Audacity", summary: "Record and edit audio",
    description:
      "Audacity is a free, open-source, cross-platform audio editor used for recording, mixing and mastering tracks.",
    category: "multimedia", platforms: ["windows", "macos", "linux"], developerId: "audacity",
    scores: [87, 84, 82], license: "GPL-3.0", repo: "https://github.com/audacity/audacity", sourceName: "GitHub",
    version: "3.7.4", releasedAt: "2026-08-19T12:00:00Z",
    notes: "New compressor, faster spectrogram rendering and plugin stability fixes.",
    unverifiedPlatform: "macos", extraTags: ["audio", "editor"],
  }),
  makeApp({
    slug: "aegis-authenticator", name: "Aegis Authenticator", summary: "Two-factor codes, offline",
    description:
      "Aegis is a free, secure and open-source two-factor authentication app for Android that keeps your codes encrypted on device.",
    category: "security", platforms: ["android"], developerId: "beem-development",
    scores: [95, 93, 71], license: "GPL-3.0", repo: "https://github.com/beemdevelopment/Aegis", sourceName: "GitHub",
    version: "3.3.1", releasedAt: "2026-07-30T10:30:00Z",
    notes: "Encrypted export improvements and Material You theming.",
    extraTags: ["2fa", "otp"],
  }),
  makeApp({
    slug: "gimp", name: "GIMP", summary: "GNU image manipulation program",
    description:
      "GIMP is a cross-platform image editor for photo retouching, image composition and image authoring.",
    category: "graphics", platforms: ["windows", "macos", "linux"], developerId: "gnome",
    scores: [90, 88, 79], license: "GPL-3.0", repo: "https://gitlab.gnome.org/GNOME/gimp", sourceName: "GitLab",
    version: "3.1.2", releasedAt: "2026-08-11T09:00:00Z",
    notes: "Non-destructive filters, faster canvas rendering and HiDPI fixes.",
    extraTags: ["image", "photo"],
  }),
  makeApp({
    slug: "inkscape", name: "Inkscape", summary: "Professional vector graphics editor",
    description:
      "Inkscape is an open-source vector graphics editor for illustrations, icons, logos, diagrams and complex artwork.",
    category: "graphics", platforms: ["windows", "macos", "linux"], developerId: "inkscape",
    scores: [89, 87, 76], license: "GPL-3.0", repo: "https://gitlab.com/inkscape/inkscape", sourceName: "GitLab",
    version: "1.4.2", releasedAt: "2026-09-01T13:45:00Z",
    notes: "Improved path effects, SVG2 support and a rewritten export dialog.",
    extraTags: ["svg", "vector"],
  }),
  makeApp({
    slug: "forgejo", name: "Forgejo", summary: "Self-hosted git forge",
    description:
      "Forgejo is a self-hosted lightweight software forge with git hosting, issue tracking, pull requests and CI.",
    category: "development", platforms: ["linux", "windows"], developerId: "forgejo",
    scores: [92, 90, 68], license: "GPL-3.0", repo: "https://codeberg.org/forgejo/forgejo", sourceName: "Codeberg",
    version: "11.0.1", releasedAt: "2026-09-09T07:30:00Z",
    notes: "Actions runner improvements, faster repository indexing and security fixes.",
    extraTags: ["git", "self-hosted"],
  }),
  makeApp({
    slug: "obs-studio", name: "OBS Studio", summary: "Live streaming and screen recording",
    description:
      "OBS Studio is free and open-source software for video recording and live streaming, with real-time source and device capture.",
    category: "multimedia", platforms: ["windows", "macos", "linux"], developerId: "obsproject",
    scores: [91, 89, 93], license: "GPL-2.0", repo: "https://github.com/obsproject/obs-studio", sourceName: "GitHub",
    version: "31.0.3", releasedAt: "2026-08-25T15:10:00Z",
    notes: "New hybrid MP4 recording, AV1 encoder presets and plugin API additions.",
    extraTags: ["streaming", "recording"],
  }),
  makeApp({
    slug: "ffmpeg", name: "FFmpeg", summary: "Record, convert and stream media",
    description:
      "FFmpeg is a complete, cross-platform solution to record, convert and stream audio and video, with a powerful command line interface.",
    category: "multimedia", platforms: ["macos", "linux", "windows"], developerId: "ffmpeg",
    scores: [94, 96, 97], license: "LGPL-2.1", repo: "https://github.com/FFmpeg/FFmpeg", sourceName: "GitHub",
    version: "8.0.1", releasedAt: "2026-09-05T10:00:00Z",
    notes: "New codecs, faster hardware decode paths and security patches.",
    extraTags: ["video", "cli"],
  }),
  makeApp({
    slug: "powertoys", name: "PowerToys", summary: "Windows power-user utilities",
    description:
      "Microsoft PowerToys is a set of utilities for power users to tune and streamline Windows for greater productivity.",
    category: "utilities", platforms: ["windows"], developerId: "microsoft",
    scores: [90, 88, 92], license: "MIT", repo: "https://github.com/microsoft/PowerToys", sourceName: "GitHub",
    version: "0.94.1", releasedAt: "2026-09-07T18:00:00Z",
    notes: "New Command Palette plugins, improved Peek and registry preview fixes.",
    extraTags: ["windows", "productivity"],
  }),
  makeApp({
    slug: "simple-gallery", name: "Simple Gallery", summary: "Offline photo gallery",
    description:
      "A gallery app for viewing and organising photos and videos, with no ads, no trackers and full offline operation.",
    category: "multimedia", platforms: ["android"], developerId: "simplemobiletools",
    scores: [86, 83, 64], license: "GPL-3.0", repo: "https://github.com/SimpleMobileTools/Simple-Gallery", sourceName: "GitHub",
    version: "6.32.4", releasedAt: "2026-08-14T09:25:00Z",
    notes: "Faster thumbnail generation, better EXIF handling and crash fixes.",
    extraTags: ["photos", "offline"],
  }),
  makeApp({
    slug: "blender", name: "Blender", summary: "3D creation suite",
    description:
      "Blender is the free and open-source 3D creation suite for modelling, sculpting, animation, simulation, rendering, compositing and video editing.",
    category: "graphics", platforms: ["windows", "macos", "linux"], developerId: "blender",
    scores: [95, 94, 96], license: "GPL-3.0", repo: "https://github.com/blender/blender", sourceName: "GitHub",
    version: "4.6.0", releasedAt: "2026-08-26T10:00:00Z",
    notes: "Geometry Nodes updates, faster Cycles rendering and sculpt improvements.",
    extraTags: ["3d", "animation", "render"],
  }),
  makeApp({
    slug: "godot", name: "Godot", summary: "2D and 3D game engine",
    description:
      "Godot is a feature-packed, cross-platform game engine to create 2D and 3D games from a unified interface, released under a permissive licence.",
    category: "development", platforms: ["windows", "macos", "linux", "android", "ios"], developerId: "godot",
    scores: [92, 91, 90], license: "MIT", repo: "https://github.com/godotengine/godot", sourceName: "GitHub",
    version: "4.5.2", releasedAt: "2026-09-03T12:30:00Z",
    notes: "Physics interpolation improvements, new lightmapper and editor usability fixes.",
    extraTags: ["game-engine", "3d", "2d"],
  }),
  makeApp({
    slug: "vlc", name: "VLC", summary: "Plays everything",
    description:
      "VLC is a free and open-source cross-platform multimedia player that plays most multimedia files, discs, streams and devices.",
    category: "multimedia", platforms: ["android", "ios", "windows", "macos", "linux"], developerId: "videolan",
    scores: [93, 92, 98], license: "GPL-2.0", repo: "https://github.com/videolan/vlc", sourceName: "GitHub",
    version: "3.0.22", releasedAt: "2026-08-30T09:00:00Z",
    notes: "Updated codecs, hardware decoding fixes and security patches.",
    extraTags: ["player", "video", "audio"],
  }),
  makeApp({
    slug: "kodi", name: "Kodi", summary: "Home theatre media centre",
    description:
      "Kodi is an open-source home theatre software that turns any device into a media centre for local and streamed content.",
    category: "multimedia", platforms: ["android", "ios", "windows", "macos", "linux"], developerId: "xbmc",
    scores: [89, 87, 85], license: "GPL-2.0", repo: "https://github.com/xbmc/xbmc", sourceName: "GitHub",
    version: "22.0", releasedAt: "2026-08-18T18:00:00Z",
    notes: "New input system, improved subtitle rendering and HDR refinements.",
    extraTags: ["media-centre", "htpc"],
  }),
  makeApp({
    slug: "qbittorrent", name: "qBittorrent", summary: "BitTorrent client",
    description:
      "qBittorrent is a free and reliable open-source BitTorrent client with an integrated search engine and no ads.",
    category: "utilities", platforms: ["windows", "macos", "linux"], developerId: "qbittorrent",
    scores: [88, 86, 87], license: "GPL-2.0", repo: "https://github.com/qbittorrent/qBittorrent", sourceName: "GitHub",
    version: "5.0.6", releasedAt: "2026-08-22T11:20:00Z",
    notes: "libtorrent 2.1 sync, WebUI fixes and faster magnet handling.",
    extraTags: ["torrent", "p2p"],
  }),
  makeApp({
    slug: "handbrake", name: "HandBrake", summary: "Video transcoder",
    description:
      "HandBrake is a free and open-source tool for converting video from nearly any format to a selection of modern, widely supported codecs.",
    category: "multimedia", platforms: ["windows", "macos", "linux"], developerId: "handbrake",
    scores: [90, 88, 83], license: "GPL-2.0", repo: "https://github.com/HandBrake/HandBrake", sourceName: "GitHub",
    version: "1.10.2", releasedAt: "2026-08-12T08:45:00Z",
    notes: "Improved AV1 encoding speed, queue enhancements and new presets.",
    extraTags: ["transcode", "video"],
  }),
  makeApp({
    slug: "nextcloud-desktop", name: "Nextcloud Desktop", summary: "Self-hosted file sync",
    description:
      "Nextcloud Desktop synchronises files between your computer and a Nextcloud server you control, with end-to-end encryption support.",
    category: "productivity", platforms: ["windows", "macos", "linux"], developerId: "nextcloud",
    scores: [91, 89, 81], license: "GPL-2.0", repo: "https://github.com/nextcloud/desktop", sourceName: "GitHub",
    version: "3.17.1", releasedAt: "2026-09-01T09:10:00Z",
    notes: "Virtual file fixes, faster sync discovery and macOS improvements.",
    extraTags: ["sync", "self-hosted", "e2ee"],
  }),
  makeApp({
    slug: "signal", name: "Signal", summary: "Private messaging",
    description:
      "Signal is an open-source messaging app with end-to-end encryption for messages and calls, built by a non-profit foundation.",
    category: "security", platforms: ["android", "ios"], developerId: "signal",
    scores: [96, 94, 94], license: "GPL-3.0", repo: "https://github.com/signalapp/Signal-Android", sourceName: "GitHub",
    version: "7.50.1", releasedAt: "2026-09-06T17:30:00Z",
    notes: "Group call improvements, message editing fixes and performance work.",
    extraTags: ["messaging", "e2ee", "calls"],
  }),
  makeApp({
    slug: "standard-notes", name: "Standard Notes", summary: "Encrypted note taking",
    description:
      "Standard Notes is an open-source, encrypted notes app with end-to-end encryption and a focus on longevity and simplicity.",
    category: "productivity", platforms: ["android", "ios", "windows", "macos", "linux"], developerId: "standardnotes",
    scores: [89, 88, 78], license: "AGPL-3.0", repo: "https://github.com/standardnotes/app", sourceName: "GitHub",
    version: "3.196.14", releasedAt: "2026-08-29T13:00:00Z",
    notes: "Editor performance improvements and export reliability fixes.",
    extraTags: ["notes", "e2ee", "markdown"],
  }),
  makeApp({
    slug: "darktable", name: "darktable", summary: "RAW photo workflow",
    description:
      "darktable is an open-source photography workflow application and RAW developer — a virtual lighttable and darkroom for photographers.",
    category: "graphics", platforms: ["windows", "macos", "linux"], developerId: "darktable",
    scores: [90, 89, 74], license: "GPL-3.0", repo: "https://github.com/darktable-org/darktable", sourceName: "GitHub",
    version: "5.2.0", releasedAt: "2026-08-09T10:00:00Z",
    notes: "New color calibration module, faster demosaic and UI refinements.",
    extraTags: ["raw", "photo", "editing"],
  }),
  makeApp({
    slug: "dbeaver", name: "DBeaver", summary: "Universal database tool",
    description:
      "DBeaver is a free, universal database management tool for developers and analysts, supporting dozens of database engines.",
    category: "development", platforms: ["windows", "macos", "linux"], developerId: "dbeaver",
    scores: [88, 87, 86], license: "Apache-2.0", repo: "https://github.com/dbeaver/dbeaver", sourceName: "GitHub",
    version: "25.2.0", releasedAt: "2026-08-15T07:00:00Z",
    notes: "New SQL editor features, better SSH tunnelling and driver updates.",
    extraTags: ["database", "sql", "er-diagrams"],
  }),
];

/* Relationship graph for the recommendation engine responses. */
const bySlugSafe = (slug: string) => APPS.find((a) => a.slug === slug || a.id === slug) ?? null;
const link = (slug: string, similar: string[], alternatives: string[] = []) => {
  const app = bySlugSafe(slug);
  if (app) {
    app.similar = similar;
    app.alternatives = alternatives;
  }
};
link("localsend", ["rustdesk", "joplin", "signal"], ["rustdesk"]);
link("joplin", ["bitwarden", "keepassxc", "standard-notes"], ["standard-notes"]);
link("keepassxc", ["bitwarden", "aegis-authenticator", "signal"], ["bitwarden"]);
link("rustdesk", ["localsend", "obs-studio", "qbittorrent"], ["localsend"]);
link("bitwarden", ["keepassxc", "aegis-authenticator", "signal"], ["keepassxc"]);
link("audacity", ["ffmpeg", "obs-studio", "vlc"], []);
link("aegis-authenticator", ["keepassxc", "bitwarden"], []);
link("gimp", ["inkscape", "blender", "darktable"], ["inkscape"]);
link("inkscape", ["gimp", "blender"], ["gimp"]);
link("forgejo", ["godot", "dbeaver"], []);
link("obs-studio", ["ffmpeg", "audacity", "kodi"], []);
link("ffmpeg", ["obs-studio", "audacity", "handbrake"], []);
link("powertoys", ["qbittorrent", "localsend"], []);
link("simple-gallery", ["darktable", "audacity"], []);
link("blender", ["gimp", "godot", "inkscape"], []);
link("godot", ["blender", "forgejo"], []);
link("vlc", ["kodi", "ffmpeg", "obs-studio"], ["kodi"]);
link("kodi", ["vlc", "obs-studio"], ["vlc"]);
link("qbittorrent", ["localsend", "powertoys"], []);
link("handbrake", ["ffmpeg", "vlc"], []);
link("nextcloud-desktop", ["joplin", "standard-notes"], []);
link("signal", ["bitwarden", "localsend"], []);
link("standard-notes", ["joplin", "nextcloud-desktop"], ["joplin"]);
link("darktable", ["gimp", "simple-gallery"], []);
link("dbeaver", ["forgejo", "godot"], []);

interface CollectionSeed {
  id: string;
  slug: string;
  name: string;
  description: string;
  appSlugs: string[];
}

const COLLECTIONS: CollectionSeed[] = [
  {
    id: "00000000-0000-4000-8000-000000000001", slug: "featured",
    name: "Featured", description: "Hand-picked essentials the editors highlight this week.",
    appSlugs: ["localsend", "keepassxc", "joplin", "bitwarden"],
  },
  {
    id: "00000000-0000-4000-8000-000000000002", slug: "privacy-first",
    name: "Privacy First", description: "Apps that respect your data and never phone home.",
    appSlugs: ["keepassxc", "bitwarden", "aegis-authenticator", "rustdesk", "signal", "standard-notes"],
  },
  {
    id: "00000000-0000-4000-8000-000000000003", slug: "creative-studio",
    name: "Creative Studio", description: "Everything you need to make images, audio and video.",
    appSlugs: ["gimp", "inkscape", "audacity", "obs-studio", "ffmpeg", "blender", "darktable"],
  },
  {
    id: "00000000-0000-4000-8000-000000000004", slug: "self-hosted",
    name: "Self-hosted", description: "Run your own infrastructure without a vendor in the middle.",
    appSlugs: ["forgejo", "rustdesk", "nextcloud-desktop", "bitwarden"],
  },
  {
    id: "00000000-0000-4000-8000-000000000005", slug: "android-essentials",
    name: "Android Essentials", description: "The open-source apps worth installing first on a new phone.",
    appSlugs: ["localsend", "aegis-authenticator", "simple-gallery", "joplin", "bitwarden", "vlc", "signal"],
  },
];

const CATEGORIES = [
  { category_type: "utilities", slug: "utilities", name: "Utilities", description: "Everyday tools and helpers.", icon: "wrench", sort_order: 1 },
  { category_type: "productivity", slug: "productivity", name: "Productivity", description: "Notes, tasks and office apps.", icon: "check", sort_order: 2 },
  { category_type: "security", slug: "security", name: "Security", description: "Password managers and privacy tools.", icon: "shield", sort_order: 3 },
  { category_type: "graphics", slug: "graphics", name: "Graphics", description: "Image, vector and 3D editors.", icon: "palette", sort_order: 4 },
  { category_type: "multimedia", slug: "multimedia", name: "Multimedia", description: "Audio, video and streaming tools.", icon: "play", sort_order: 5 },
  { category_type: "development", slug: "development", name: "Development", description: "Engines, editors and build tooling.", icon: "code", sort_order: 6 },
];

const PLATFORMS = [
  { platform_type: "android", name: "Android", display_name: "Android", icon: "android" },
  { platform_type: "ios", name: "iOS", display_name: "iOS", icon: "ios" },
  { platform_type: "windows", name: "Windows", display_name: "Windows", icon: "windows" },
  { platform_type: "macos", name: "macOS", display_name: "macOS", icon: "macos" },
  { platform_type: "linux", name: "Linux", display_name: "Linux", icon: "linux" },
];

/* ------------------------------------------------------------------ */
/* Query + response builders                                           */
/* ------------------------------------------------------------------ */

export function catalogApps() {
  return APPS;
}

export function bySlug(slug: string) {
  return APPS.find((a) => a.slug === slug || a.id === slug) ?? null;
}

function paginate<T>(items: T[], page: number, perPage: number) {
  return {
    items: items.slice((page - 1) * perPage, page * perPage),
    total: items.length,
    page,
    freshness: NOW,
  };
}

function matchesQuery(entry: ReturnType<typeof makeApp>, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  const haystacks = [
    entry.name,
    entry.short_description,
    entry.description,
    entry.developer?.name,
    ...(entry.tags ?? []),
  ]
    .filter(Boolean)
    .map((v) => String(v).toLowerCase());
  return haystacks.some((hay) => hay.includes(needle));
}

function relevanceScore(entry: ReturnType<typeof makeApp>, q: string): number {
  if (!q) return 0;
  const needle = q.toLowerCase();
  const name = entry.name.toLowerCase();
  let score = 0;
  if (name === needle) score += 100;
  else if (name.startsWith(needle)) score += 60;
  else if (name.includes(needle)) score += 40;
  if (entry.short_description?.toLowerCase().includes(needle)) score += 20;
  if (entry.tags.some((t) => t.includes(needle))) score += 15;
  if (entry.description?.toLowerCase().includes(needle)) score += 5;
  return score;
}

export function listApps(params: Record<string, string | null>, search = false) {
  let items = [...APPS];
  const q = (params.q ?? "").trim();

  if (q) items = items.filter((entry) => matchesQuery(entry, q));

  const category = params.category;
  if (category) items = items.filter((entry) => entry.categories.includes(category));

  const platform = params.platform;
  if (platform) items = items.filter((entry) => entry.platforms.includes(platform));

  const developer = params.developer;
  if (developer) {
    items = items.filter(
      (entry) => entry.developer?.slug === developer || entry.developer?.id === developer,
    );
  }

  const license = params.license;
  if (license) items = items.filter((entry) => entry.license?.toLowerCase() === license.toLowerCase());

  const openSource = params.open_source;
  if (openSource === "true" || openSource === "1") items = items.filter((entry) => entry.open_source);
  if (openSource === "false" || openSource === "0") items = items.filter((entry) => !entry.open_source);

  const architecture = params.architecture;
  if (architecture) {
    items = items.filter((entry) =>
      (entry.latest_release?.assets ?? []).some((asset) => asset.architecture === architecture),
    );
  }

  const minTrust = Number.parseInt(params.min_trust ?? "", 10);
  if (Number.isFinite(minTrust)) items = items.filter((entry) => (entry.scores?.trust ?? 0) >= minTrust);

  const minQuality = Number.parseInt(params.min_quality ?? "", 10);
  if (Number.isFinite(minQuality)) items = items.filter((entry) => (entry.scores?.quality ?? 0) >= minQuality);

  const updatedSince = params.updated_since;
  if (updatedSince && !Number.isNaN(Date.parse(updatedSince))) {
    const since = Date.parse(updatedSince);
    items = items.filter((entry) => (entry.updated_at ? Date.parse(entry.updated_at) >= since : false));
  }

  const sort = params.sort ?? (search ? "relevance" : "popularity");
  if (sort === "name") items.sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === "updated") items.sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""));
  else if (sort === "newest") items.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
  else if (sort === "trust") items.sort((a, b) => (b.scores?.trust ?? 0) - (a.scores?.trust ?? 0));
  else if (sort === "relevance") items.sort((a, b) => relevanceScore(b, q) - relevanceScore(a, q));
  else items.sort((a, b) => (b.scores?.popularity ?? 0) - (a.scores?.popularity ?? 0));

  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const perPage = Math.min(100, Number.parseInt(params.per_page ?? "24", 10) || 24);

  return paginate(items, page, perPage);
}

export function trendingApps() {
  return [...APPS].sort((a, b) => (b.scores?.popularity ?? 0) - (a.scores?.popularity ?? 0));
}

export function latestApps() {
  return [...APPS].sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""));
}

export function catalogStats() {
  const releases = APPS.reduce((sum, entry) => sum + entry.releases.length + 1, 0);
  const assets = APPS.reduce((sum, entry) => sum + (entry.latest_release?.assets.length ?? 0), 0);
  return {
    applications: APPS.length,
    total_apps: APPS.length,
    repositories: APPS.length,
    releases,
    assets,
    sources: new Set(APPS.map((entry) => entry.source_name)).size,
    platforms: PLATFORMS.length,
    categories: CATEGORIES.length,
    total_downloads: null,
  };
}

export function catalogCategories() {
  return CATEGORIES;
}

export function catalogCategory(slug: string) {
  const category = CATEGORIES.find((entry) => entry.slug === slug);
  if (!category) return null;
  return {
    ...category,
    app_count: APPS.filter((entry) => entry.categories.includes(slug)).length,
  };
}

export function catalogPlatforms() {
  return PLATFORMS;
}

export function catalogDevelopers() {
  return Object.values(DEVELOPERS).map((developer) => ({
    ...developer,
    app_count: APPS.filter((entry) => entry.developer?.slug === developer.slug).length,
  }));
}

export function catalogDeveloper(slug: string) {
  const developer = DEVELOPERS[slug];
  if (!developer) return null;
  return {
    ...developer,
    app_count: APPS.filter((entry) => entry.developer?.slug === slug).length,
  };
}

export function catalogCollections() {
  return COLLECTIONS.map(({ appSlugs, ...rest }) => ({
    ...rest,
    is_public: true,
    item_count: appSlugs.length,
    created_at: NOW,
    updated_at: NOW,
  }));
}

export function catalogCollection(key: string) {
  const collection = COLLECTIONS.find((entry) => entry.id === key || entry.slug === key);
  if (!collection) return null;
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

function recommendationItem(targetApp: unknown, score: number, kind: string, reasons: string[]) {
  return { app: targetApp, score, kind, reasons };
}

function recommendationsFor(slug: string, kind: "similar" | "all", limit: number) {
  const subject = bySlug(slug);
  const graph = kind === "similar" ? subject?.similar ?? [] : [...(subject?.similar ?? []), ...(subject?.alternatives ?? [])];
  const seen = new Set<string>();
  const related = graph
    .map((targetSlug) => bySlug(targetSlug))
    .filter((target): target is AppDto => {
      if (!target || seen.has(target.id)) return false;
      seen.add(target.id);
      return true;
    });
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

export function recommendationsAll(slug: string, limit: number) {
  return recommendationsFor(slug, "all", limit);
}

export function recommendationsSimilar(slug: string, limit: number) {
  return recommendationsFor(slug, "similar", limit);
}

export function recommendationsTrending(limit: number) {
  return {
    subject_app_id: null,
    algorithm_version: "v1",
    generated_at: NOW,
    items: [...APPS]
      .sort((a, b) => (b.scores?.popularity ?? 0) - (a.scores?.popularity ?? 0))
      .slice(0, limit)
      .map((entry, index) => recommendationItem(entry, 0.9 - index * 0.05, "trending", ["Trending this week"])),
  };
}

export function recommendationsDiscover(sort: "new" | "popular", limit: number, category?: string) {
  const items = APPS.filter((entry) => !category || entry.categories.includes(category));
  return {
    subject_app_id: null,
    algorithm_version: "v1",
    generated_at: NOW,
    items: [...items]
      .sort((a, b) =>
        sort === "popular"
          ? (b.scores?.popularity ?? 0) - (a.scores?.popularity ?? 0)
          : (b.updated_at ?? "").localeCompare(a.updated_at ?? ""),
      )
      .slice(0, limit)
      .map((entry, index) =>
        recommendationItem(entry, 0.9 - index * 0.05, sort === "popular" ? "popular" : "new", ["Recently updated"]),
      ),
  };
}

export function trustFor(slug: string) {
  const subject = bySlug(slug);
  if (!subject) return null;
  return {
    app_id: subject.id,
    score: subject.scores?.trust ?? null,
    factors: {
      open_source_license: 1,
      validated_assets: 0.95,
      recent_releases: 0.9,
      active_repository: 0.85,
      established_contributors: 0.8,
    },
    badges:
      (subject.scores?.trust ?? 0) >= 90
        ? ["verified", "trusted", "community_verified"]
        : ["verified", "community_verified"],
    calculated_at: NOW,
  };
}

export function securityFor(slug: string) {
  const subject = bySlug(slug);
  if (!subject) return null;
  const score = Math.min(100, (subject.scores?.trust ?? 80) + 2);
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
