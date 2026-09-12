import type { Platform } from "@omnistore/shared-models";
import type { SourceId } from "@/lib/sources";

/**
 * A source the user tracks.
 *
 * This is the Obtanium-shaped core of OmniStore: the user follows an
 * upstream, OmniStore remembers the version they last acknowledged, and the
 * update inbox diffs that against whatever OmniSource currently reports.
 *
 * Everything here is device-local. Nothing is uploaded, and no account is
 * required — the same privacy model as the rest of the personal library.
 */
export interface TrackedApp {
  /** Stable key: the catalog id when resolved, otherwise the normalised URL. */
  key: string;
  /** Catalog app id, or `null` when OmniSource has not indexed this source yet. */
  appId: string | null;
  slug: string | null;
  name: string;
  sourceUrl: string;
  source: SourceId;
  icon: string | null;
  developer: string;
  platforms: Platform[];
  /** Version the user last acknowledged (or the version at add time). */
  seenVersion: string | null;
  /** Latest version OmniSource reported at the last refresh. */
  latestVersion: string | null;
  latestReleasedAt: string | null;
  addedAt: string;
  refreshedAt: string | null;
  /** True when the source is tracked but not (yet) in the catalog. */
  pending: boolean;
}

/** A tracked source whose upstream has shipped a newer release. */
export interface TrackedUpdate {
  app: TrackedApp;
  from: string | null;
  to: string;
  releasedAt: string | null;
}

/**
 * An update is only reported when both sides are known and differ.
 * Unknown versions never produce a false "update available".
 */
export function updateFor(app: TrackedApp): TrackedUpdate | null {
  if (app.pending) return null;
  if (!app.latestVersion) return null;
  if (!app.seenVersion) return null;
  if (app.seenVersion === app.latestVersion) return null;
  return {
    app,
    from: app.seenVersion,
    to: app.latestVersion,
    releasedAt: app.latestReleasedAt,
  };
}

export function hasUpdate(app: TrackedApp): boolean {
  return updateFor(app) !== null;
}

/** Sort: pending last, then updates first, then most recently refreshed. */
export function compareTracked(a: TrackedApp, b: TrackedApp): number {
  if (a.pending !== b.pending) return a.pending ? 1 : -1;
  const aUpdate = hasUpdate(a) ? 0 : 1;
  const bUpdate = hasUpdate(b) ? 0 : 1;
  if (aUpdate !== bUpdate) return aUpdate - bUpdate;
  return (b.refreshedAt ?? b.addedAt).localeCompare(a.refreshedAt ?? a.addedAt);
}
