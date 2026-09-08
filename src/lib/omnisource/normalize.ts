/**
 * OmniSource-side normalisation.
 *
 * This module belongs to the DATA LAYER (OmniSource), never to the UI.
 * It converts raw upstream release artefacts into the normalised
 * `platform` / `architecture` / `package_type` triple that OmniStore clients
 * render verbatim. The web UI never guesses "android = APK".
 *
 * Ambiguous artefacts are dropped, never mislabelled: an artefact whose
 * platform cannot be determined with confidence is excluded from the feed.
 */

import type { Architecture, Asset, AssetStatus, PackageType, Platform } from "@/lib/schemas/omnisource";

/* ------------------------------------------------------------------ */
/* Host policy                                                         */
/* ------------------------------------------------------------------ */

/**
 * Release hosts OmniSource accepts as verified distribution origins.
 * Adding a host is a deliberate, auditable decision.
 */
export const RELEASE_HOST_ALLOWLIST = [
  "github.com",
  "objects.githubusercontent.com",
  "github-releases.githubusercontent.com",
  "githubusercontent.com",
  "raw.githubusercontent.com",
  "f-droid.org",
  "flathub.org",
  "dl.flathub.org",
  "download.opensuse.org",
  "ftp.gnome.org",
  "download.kde.org",
  "files.kde.org",
  "codeberg.org",
  "gitlab.com",
  "sourceforge.net",
  "downloads.sourceforge.net",
  "mirror.opensuse.org",
  "cdn.discordapp.com",
] as const;

export function isAllowedReleaseHost(url: string): boolean {
  try {
    const { hostname, protocol } = new URL(url);
    if (protocol !== "https:") return false;
    return RELEASE_HOST_ALLOWLIST.some(
      (host) => hostname === host || hostname.endsWith(`.${host}`),
    );
  } catch {
    return false;
  }
}

/**
 * Validation is deliberately conservative.
 *
 * `VALID` means: served over HTTPS from an accepted release host.
 * It is NOT a malware scan, and the UI must never present it as one.
 */
export function validateAssetUrl(url: string): { status: AssetStatus; note: string } {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { status: "INVALID", note: "Malformed URL reported by upstream." };
  }
  if (parsed.protocol !== "https:") {
    return { status: "INVALID", note: "Upstream package is not served over HTTPS." };
  }
  if (!isAllowedReleaseHost(url)) {
    return {
      status: "REVIEW_REQUIRED",
      note: "Upstream package is hosted outside OmniSource's verified release hosts and is pending review.",
    };
  }
  return {
    status: "VALID",
    note: "Served over HTTPS from an upstream release host accepted by OmniSource.",
  };
}

/* ------------------------------------------------------------------ */
/* Extension / filename rules                                          */
/* ------------------------------------------------------------------ */

/** Files that are never installable applications. */
const EXCLUDED_EXTENSIONS = [
  ".sig",
  ".asc",
  ".pem",
  ".sha1",
  ".sha256",
  ".sha512",
  ".sum",
  ".txt",
  ".md",
  ".json",
  ".yml",
  ".yaml",
  ".blockmap",
  ".zsync",
  ".nupkg",
  ".torrent",
  ".log",
  ".xml",
  ".pdb",
  ".deb.sha256",
];

/** GitHub's auto-generated source archives: `<tag>.tar.gz` / `<tag>.zip`. */
const SOURCE_ARCHIVE_PATTERN = /^v?\d[\w.+-]*\.(tar\.gz|tgz|zip)$/i;

export function isSourceArchive(name: string): boolean {
  return (
    SOURCE_ARCHIVE_PATTERN.test(name) ||
    /\b(source|src)[-_.]?code\b/i.test(name) ||
    // Explicit "sources.zip" / "-src.tar.gz" bundles.
    /(^|[-_.])(sources?|src)([-_.]|$)/i.test(name)
  );
}

/**
 * Command-line builds are a different product from the app itself
 * (e.g. `LocalSend-CLI-…`). They are dropped so the store lists what a user
 * would actually install.
 */
export function isCliAsset(name: string): boolean {
  const lower = name.toLowerCase();
  return /(^|[-_.])cli([-_.]|$)/.test(lower);
}

export function isExcludedAsset(name: string): boolean {
  const lower = name.toLowerCase();
  if (isSourceArchive(lower)) return true;
  if (isCliAsset(lower)) return true;
  return EXCLUDED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * Grouping key for de-duplication.
 *
 * Digits are preserved except for the release version, so that genuinely
 * different artefacts (arm32 vs arm64) are never collapsed together, while
 * cosmetic variants of the same artefact are.
 */
export function artefactGroupKey(filename: string): string {
  return filename
    .toLowerCase()
    // Canonicalise architecture spellings into digit-free tokens before
    // version digits are stripped: `x86_64` and `x86-64` collapse together,
    // while `arm64` and `arm32` stay distinct.
    .replace(/(x86[_-]?64|amd64|x64)\b/g, "amdq")
    .replace(/(aarch64|arm64)\b/g, "armq")
    .replace(/(armv7[a-z]*|armv6[a-z]*|armhf|arm[_-]?32)\b/g, "armw")
    .replace(/\d+(?:[._-]\d+)*/g, "#")
    .replace(/(unsigned|signed|nightly|portable|setup|installer)/g, "")
    .replace(/[^a-z0-9#.]+/g, "");
}

type Detection = { platform: Platform; packageType: PackageType };

/** Extension-first detection. Returns null when the file is not an app package. */
function detectByExtension(name: string): Detection | null {
  const lower = name.toLowerCase();
  if (lower.endsWith(".apk")) return { platform: "android", packageType: "APK" };
  if (lower.endsWith(".aab")) return { platform: "android", packageType: "AAB" };
  if (lower.endsWith(".ipa")) return { platform: "ios", packageType: "IPA" };
  if (lower.endsWith(".msi")) return { platform: "windows", packageType: "MSI" };
  if (lower.endsWith(".msix") || lower.endsWith(".msixbundle") || lower.endsWith(".appx")) {
    return { platform: "windows", packageType: "MSIX" };
  }
  if (lower.endsWith(".exe")) return { platform: "windows", packageType: "EXE" };
  if (lower.endsWith(".dmg")) return { platform: "macos", packageType: "DMG" };
  if (lower.endsWith(".pkg")) return { platform: "macos", packageType: "PKG" };
  if (lower.endsWith(".appimage")) return { platform: "linux", packageType: "APPIMAGE" };
  if (lower.endsWith(".deb")) return { platform: "linux", packageType: "DEB" };
  if (lower.endsWith(".rpm")) return { platform: "linux", packageType: "RPM" };
  if (lower.endsWith(".flatpak") || lower.endsWith(".flatpakref")) {
    return { platform: "linux", packageType: "FLATPAK" };
  }
  if (lower.endsWith(".snap")) return { platform: "linux", packageType: "SNAP" };
  // .jar builds are not platform-specific packages; they are intentionally
  // dropped rather than mislabelled as belonging to one operating system.
  return null;
}

/** Archives need a platform keyword in the filename, otherwise we drop them. */
function detectByKeyword(name: string): Detection | null {
  const lower = name.toLowerCase();
  const isArchive =
    /\.(tar\.gz|tgz|tar\.xz|tar\.bz2|tar|zip|7z)$/.test(lower) || lower.endsWith(".jar");
  if (!isArchive) return null;

  const has = (...needles: string[]) => needles.some((n) => lower.includes(n));

  // Order matters: "android" before "linux" (some builds say android-linux).
  if (has("android")) return { platform: "android", packageType: lower.endsWith(".zip") ? "ZIP" : "TAR" };
  if (has("ios", "iphone", "ipad")) return { platform: "ios", packageType: lower.endsWith(".zip") ? "ZIP" : "TAR" };
  if (has("darwin", "macos", "mac-os", "mac", "osx", "apple")) {
    return { platform: "macos", packageType: lower.endsWith(".zip") ? "ZIP" : "TAR" };
  }
  if (has("win64", "win32", "win-x64", "win-x86", "windows", "winnt", ".win.")) {
    return { platform: "windows", packageType: lower.endsWith(".zip") ? "ZIP" : "TAR" };
  }
  if (has("linux", "gnu", "glibc", "musl", "ubuntu", "debian", "fedora", "arch")) {
    return { platform: "linux", packageType: lower.endsWith(".zip") ? "ZIP" : "TAR" };
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Architecture                                                        */
/* ------------------------------------------------------------------ */

export function detectArchitecture(name: string, fallback: Architecture = "any"): Architecture {
  const lower = name.toLowerCase();
  if (/(universal|any|all[-_.]?arch|fat)/.test(lower)) return "universal";
  if (/(aarch64|arm64|armv8|arm-64|arm64v8|arm64e|m1|apple-silicon)/.test(lower)) return "arm64";
  if (/(x86_64|x86-64|x64|amd64|win64|x64-64)/.test(lower)) return "x86_64";
  if (/(armv7|armv7l|arm-32|arm32|armeabi-v7a|armhf|arm-7)/.test(lower)) return "arm";
  if (/(i386|i686|x86-32|win32|x86\b)/.test(lower)) return "x86";
  return fallback;
}

/** macOS universal builds ship a single binary for Intel + Apple Silicon. */
function isMacUniversal(name: string): boolean {
  const lower = name.toLowerCase();
  return /(universal|darwin|macos|mac-os|osx)/.test(lower) && !/(x86_64|x64|arm64|aarch64|intel|silicon)/.test(lower);
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export type NormalisedAsset = {
  platform: Platform;
  architecture: Architecture;
  package_type: PackageType;
  filename: string;
};

/**
 * Normalise one upstream artefact. Returns `null` when the artefact cannot be
 * classified confidently — dropping data is always better than mislabelling it.
 */
export function normaliseAsset(filename: string, sizeBytes?: number | null): NormalisedAsset | null {
  if (!filename) return null;
  if (isExcludedAsset(filename)) return null;

  const detection = detectByExtension(filename) ?? detectByKeyword(filename);
  if (!detection) return null;

  let architecture = detectArchitecture(filename);
  if (architecture === "any") {
    // Upstream ships one artefact for the whole platform when no ABI is encoded
    // in the filename: macOS disk images/installers and universal Android APKs.
    if (detection.platform === "macos" || detection.platform === "android") {
      architecture = "universal";
    }
  }

  return {
    platform: detection.platform,
    architecture,
    package_type: detection.packageType,
    filename,
  };
}

/**
 * Preference score used for de-duplication: signed > unsigned, release > debug,
 * and larger artefacts win when both look equally legitimate.
 */
export function artefactPreference(filename: string, sizeBytes: number | null): number {
  const lower = filename.toLowerCase();
  let score = 0;
  if (!/(unsigned|un-notarized|debug|nightly|beta|alpha|rc\b)/.test(lower)) score += 1000;
  if (!/(-cli|cli-|commandline|console)/.test(lower)) score += 400;
  if (/(setup|installer)/.test(lower)) score += 200;
  if (/(portable)/.test(lower)) score -= 50;
  score += Math.min(sizeBytes ?? 0, 500_000_000) / 1_000_000;
  return score;
}

/**
 * Collapses cosmetic duplicates of the same artefact, keeping the variant a
 * user should get (signed over unsigned, installer over portable).
 */
/**
 * Collapses cosmetic duplicates of the same artefact, keeping the variant a
 * user should get (signed over unsigned, installer over portable).
 */
export function dedupeAssets(assets: Asset[]): Asset[] {
  const byUrl = new Map<string, Asset>();
  for (const asset of assets) byUrl.set(asset.url, asset);

  const groups = new Map<string, Asset[]>();
  for (const asset of byUrl.values()) {
    const key = [
      asset.platform,
      asset.architecture,
      asset.package_type,
      artefactGroupKey(asset.filename ?? ""),
    ].join("|");
    const list = groups.get(key) ?? [];
    list.push(asset);
    groups.set(key, list);
  }

  return [...groups.values()].map((list) =>
    list.reduce((best, current) =>
      artefactPreference(current.filename ?? "", current.size_bytes) >
      artefactPreference(best.filename ?? "", best.size_bytes)
        ? current
        : best,
    ),
  );
}

/**
 * Human-readable version from an upstream tag.
 *
 * Only redundant prefixes are removed (`v`, `version_`, `release-`, `stable-`
 * and a repeated project name). Nothing is invented: an unparseable tag is
 * shown exactly as upstream published it.
 */
export function versionFromTag(tag: string | null | undefined, appName?: string | null): string {
  if (!tag) return "unknown";

  let version = tag.trim();

  // `v1.2.3` / `v.1.2.3` — but never eat a leading `v` that is part of a word.
  // `v.1.2.3` first, then `v1.2.3`: never eat a `v` that starts a word.
  version = version.replace(/^[vV]\.(?=\d)/, "").replace(/^[vV](?=\d)/, "");
  // `version_2.9.6`, `release-5.2.3`, `stable-34.1.1`
  version = version.replace(/^(?:version|release|stable|final)[-_.]?(?=\d)/i, "");
  // `Audacity-4.0.0`, `jq_1.8.2` — a tag that repeats the project name.
  if (appName) {
    // Escape regex metacharacters: names like "Xournal++" or "C++" would
    // otherwise build an invalid pattern and break ingest.
    const prefix = appName
      .trim()
      .replace(/[\s._]+/g, "[\s._-]?")
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (prefix) {
      try {
        version = version.replace(new RegExp(`^${prefix}[-_.]?(?=\\d)`, "i"), "");
      } catch {
        // An unparseable pattern must never break ingest: keep the raw tag.
      }
    }
  }

  version = version.trim();
  return version || "unknown";
}
