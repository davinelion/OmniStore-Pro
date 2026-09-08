/**
 * Display formatting.
 *
 * Every formatter has an explicit "unknown" output. OmniStore never renders a
 * placeholder number, date or size for data OmniSource did not supply.
 */

import type { Architecture, PackageType, Platform } from "@/lib/schemas/omnisource";

export const NOT_AVAILABLE = "Not available";

export function formatBytes(bytes?: number | null): string {
  if (bytes == null || Number.isNaN(bytes)) return NOT_AVAILABLE;
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  const rounded = exponent === 0 ? Math.round(value) : value >= 100 ? Math.round(value) : Number(value.toFixed(1));
  return `${rounded} ${units[exponent]}`;
}

export function formatNumber(value?: number | null): string {
  if (value == null || Number.isNaN(value)) return NOT_AVAILABLE;
  return value.toLocaleString("en-US");
}

export function formatCompactNumber(value?: number | null): string {
  if (value == null || Number.isNaN(value)) return NOT_AVAILABLE;
  return Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function formatDate(iso?: string | null): string {
  if (!iso) return NOT_AVAILABLE;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return NOT_AVAILABLE;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return NOT_AVAILABLE;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return NOT_AVAILABLE;
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "3 days ago" — never "live", never "just now" with fake precision. */
export function relativeTime(iso?: string | null, now = Date.now()): string {
  if (!iso) return NOT_AVAILABLE;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return NOT_AVAILABLE;

  const seconds = Math.round((now - then) / 1000);
  if (seconds < 0) return formatDate(iso);

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["week", 604_800],
    ["day", 86_400],
    ["hour", 3600],
    ["minute", 60],
  ];

  const rtf = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });
  for (const [unit, secondsInUnit] of units) {
    if (seconds >= secondsInUnit) {
      return rtf.format(-Math.round(seconds / secondsInUnit), unit);
    }
  }
  return "just now";
}

/** Sentence-cased freshness for card metadata, e.g. "Updated 2 days ago". */
export function freshnessLabel(iso?: string | null, now = Date.now()): string | null {
  if (!iso) return null;
  const rel = relativeTime(iso, now);
  return rel === NOT_AVAILABLE ? null : `Updated ${rel}`;
}

export function platformLabel(platform: string): string {
  const map: Record<Platform, string> = {
    ios: "iOS",
    ipados: "iPadOS",
    android: "Android",
    windows: "Windows",
    macos: "macOS",
    linux: "Linux",
  };
  return map[platform as Platform] ?? platform;
}

export function architectureLabel(architecture: string): string {
  const map: Record<Architecture, string> = {
    arm64: "ARM64 / Apple Silicon",
    arm: "ARM",
    x86_64: "x86_64",
    x86: "x86",
    universal: "Universal",
    any: "Any",
  };
  return map[architecture as Architecture] ?? architecture;
}

export function packageTypeLabel(packageType: string): string {
  const map: Record<PackageType, string> = {
    APK: "APK",
    AAB: "AAB",
    IPA: "IPA",
    EXE: "EXE",
    MSI: "MSI",
    MSIX: "MSIX",
    PORTABLE: "Portable",
    DMG: "DMG",
    PKG: "PKG",
    APPIMAGE: "AppImage",
    DEB: "DEB",
    RPM: "RPM",
    FLATPAK: "Flatpak",
    SNAP: "Snap",
    TAR: "TAR",
    ZIP: "ZIP",
    SOURCE: "Source",
    OTHER: "Other",
  };
  return map[packageType as PackageType] ?? packageType;
}

/**
 * Unambiguous download labels — a button must say exactly what it fetches.
 * e.g. "Download Android APK — ARM64"
 */
export function assetLabel(asset: {
  platform: string;
  package_type: string;
  architecture: string;
}): string {
  const platform = platformLabel(asset.platform);
  const pkg = packageTypeLabel(asset.package_type);
  const arch = architectureLabel(asset.architecture);
  return `${platform} ${pkg} — ${arch}`;
}

export function downloadLabel(asset: {
  platform: string;
  package_type: string;
  architecture: string;
}): string {
  return `Download ${assetLabel(asset)}`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count.toLocaleString("en-US")} ${count === 1 ? singular : plural}`;
}

export function titleCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
