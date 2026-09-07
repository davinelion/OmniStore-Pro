import type { Asset } from "@/lib/schemas/omnisource";
import { isSafeUrl } from "@/lib/security/urls";

export interface PlatformInstaller {
  canInstall(asset: Asset): boolean;
  install(asset: Asset): Promise<void>;
}

export const BrowserDownloadInstaller: PlatformInstaller = {
  canInstall(asset) {
    return asset.status === "VALID" && isSafeUrl(asset.url);
  },
  async install(asset) {
    if (!this.canInstall(asset)) throw new Error("Asset is not downloadable");
    window.location.href = asset.url;
  },
};

export interface UpdateProvider {
  getLatestVersion(appId: string): Promise<string | undefined>;
  isUpdateAvailable(current: string, latest: string): boolean;
}

export function compareVersions(current: string, latest: string) {
  const a = current.split(".").map((n) => parseInt(n, 10) || 0);
  const b = latest.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (b[i] ?? 0) - (a[i] ?? 0);
    if (d !== 0) return d > 0;
  }
  return false;
}
