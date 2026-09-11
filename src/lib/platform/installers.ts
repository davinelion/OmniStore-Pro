/**
 * Installation abstraction.
 *
 * The web client cannot install software — it hands the user to the upstream
 * release and the operating system does the work. The contract exists so that
 * future native clients (iOS/Android/Windows/macOS/Linux) can implement the
 * same interface without OmniStore's domain logic changing.
 */

import type { ReleaseAsset } from "@omnistore/shared-models";
import { isSafeUrl } from "@/lib/security/urls";

/** Client-side install guard: only VALID, https assets are handed off. */
function isDownloadableAsset(asset: ReleaseAsset): boolean {
  return asset.status === "VALID" && Boolean(asset.url);
}

function assetStatusNote(asset: ReleaseAsset): string {
  switch (asset.status) {
    case "INVALID":
      return "This asset failed upstream verification and cannot be installed.";
    case "QUARANTINED":
      return "This asset is quarantined pending a security review.";
    case "REVIEW_REQUIRED":
      return "This asset is awaiting review and is not yet available.";
    default:
      return "This asset is not available for installation.";
  }
}

export interface PlatformInstaller {
  /** Human readable platform name, e.g. "Android". */
  readonly platform: string;
  /** True when this client can complete an installation for the asset. */
  canInstall(asset: ReleaseAsset): boolean;
  /** Starts the installation flow. Rejects when the asset is not installable. */
  install(asset: ReleaseAsset): Promise<InstallResult>;
}

export type InstallResult = {
  status: "handoff" | "started" | "unsupported";
  message: string;
};

/**
 * Web installer: opens the verified upstream URL.
 *
 * It refuses anything OmniSource has not marked VALID, and refuses any URL
 * that is not https.
 */
export const BrowserDownloadInstaller: PlatformInstaller = {
  platform: "web",
  canInstall(asset) {
    return isDownloadableAsset(asset) && isSafeUrl(asset.url);
  },
  async install(asset) {
    if (!this.canInstall(asset)) {
      return { status: "unsupported", message: assetStatusNote(asset) };
    }
    return {
      status: "handoff",
      message:
        "OmniStore will open the upstream download. Installation is handled by your operating system.",
    };
  },
};

export function getInstaller(): PlatformInstaller {
  // Future clients register their own installer here (IOSInstaller, APKInstaller,
  // WindowsInstaller, MacOSInstaller, LinuxInstaller) based on the runtime.
  return BrowserDownloadInstaller;
}

/* ------------------------------------------------------------------ */
/* Updates                                                             */
/* ------------------------------------------------------------------ */

export interface UpdateProvider {
  getLatestVersion(appId: string): Promise<string | undefined>;
  isUpdateAvailable(current: string, latest: string): boolean;
}

/**
 * Semantic-ish version comparison for future installed-app tracking.
 *
 * Web uses it to display "Latest version: x.y.z"; native clients will use the
 * same helper to decide whether an installed app is out of date.
 */
export function compareVersions(current: string, latest: string): number {
  const parse = (value: string) =>
    value
      .replace(/^[^\d]*/, "")
      .split(/[.+-]/)
      .map((part) => Number.parseInt(part, 10) || 0);

  const a = parse(current);
  const b = parse(latest);
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) {
    const diff = (b[i] ?? 0) - (a[i] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

export function isUpdateAvailable(current: string, latest: string): boolean {
  if (!current || !latest) return false;
  return compareVersions(current, latest) > 0;
}

export const webUpdateProvider: UpdateProvider = {
  async getLatestVersion() {
    // The web client has no installed-app registry; pages read the latest
    // version from OmniSource metadata instead.
    return undefined;
  },
  isUpdateAvailable,
};
