import type { Platform } from "@omnistore/shared-models";
import type { SourceId } from "@/lib/sources";

/**
 * A source the user tracks — now with Obtanium-style per-app settings.
 *
 * Obtanium model: user follows upstream, OmniStore remembers installed version,
 * checks source directly for updates, notifies, allows direct download.
 *
 * Device-local, no account, same privacy as rest of library.
 */
export interface TrackedApp {
  /** Stable key: catalog id when resolved, otherwise normalised URL. */
  key: string;
  /** Catalog app id, or `null` when not yet indexed. */
  appId: string | null;
  slug: string | null;
  name: string;
  sourceUrl: string;
  source: SourceId;
  icon: string | null;
  developer: string;
  platforms: Platform[];
  /** Version the user has installed / last acknowledged. */
  seenVersion: string | null;
  /** User-declared installed version (Obtanium: version on device). */
  installedVersion: string | null;
  /** Latest version OmniSource reported. */
  latestVersion: string | null;
  latestReleasedAt: string | null;
  addedAt: string;
  refreshedAt: string | null;
  /** True when source not yet in catalog. */
  pending: boolean;

  // --- Obtanium-style per-app settings ---
  /** Auto-update when new version found (like Obtanium background update). */
  autoUpdate: boolean;
  /** Include pre-releases / RCs (Obtanium: allow pre-release). */
  includePrerelease: boolean;
  /** Version to skip — don't notify for this version. */
  skippedVersion: string | null;
  /** Track only — don't show in updates, just track (Obtanium track-only). */
  trackOnly: boolean;
  /** Allow downgrade / rollback — show older releases. */
  allowDowngrade: boolean;
  /** Download only on Wi-Fi (preference, can't enforce on web but stored). */
  wifiOnly: boolean;
  /** Update only while charging (preference). */
  chargingOnly: boolean;
  /** Custom filter for release detection (Obtanium: version regex). */
  versionFilter: string | null;
  /** Last time user was notified about update. */
  lastNotifiedAt: string | null;
}

export interface TrackedUpdate {
  app: TrackedApp;
  from: string | null;
  to: string;
  releasedAt: string | null;
  /** Whether this update is skippable (not skipped). */
  isSkipped: boolean;
}

export function updateFor(app: TrackedApp): TrackedUpdate | null {
  if (app.pending) return null;
  if (!app.latestVersion) return null;
  if (app.trackOnly) return null;
  // If user skipped this version, don't show as update
  if (app.skippedVersion && app.skippedVersion === app.latestVersion) return null;
  const current = app.installedVersion ?? app.seenVersion;
  if (!current) return null;
  if (current === app.latestVersion) return null;
  // Simple version comparison — if same, no update
  return {
    app,
    from: current,
    to: app.latestVersion,
    releasedAt: app.latestReleasedAt,
    isSkipped: false,
  };
}

export function hasUpdate(app: TrackedApp): boolean {
  return updateFor(app) !== null;
}

export function compareTracked(a: TrackedApp, b: TrackedApp): number {
  if (a.pending !== b.pending) return a.pending ? 1 : -1;
  const aUpdate = hasUpdate(a) ? 0 : 1;
  const bUpdate = hasUpdate(b) ? 0 : 1;
  if (aUpdate !== bUpdate) return aUpdate - bUpdate;
  return (b.refreshedAt ?? b.addedAt).localeCompare(a.refreshedAt ?? a.addedAt);
}

export function defaultTrackedSettings(): Pick<TrackedApp, "autoUpdate" | "includePrerelease" | "skippedVersion" | "trackOnly" | "allowDowngrade" | "wifiOnly" | "chargingOnly" | "versionFilter" | "lastNotifiedAt" | "installedVersion"> {
  return {
    autoUpdate: false,
    includePrerelease: false,
    skippedVersion: null,
    trackOnly: false,
    allowDowngrade: false,
    wifiOnly: false,
    chargingOnly: false,
    versionFilter: null,
    lastNotifiedAt: null,
    installedVersion: null,
  };
}
