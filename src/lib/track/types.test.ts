import { describe, expect, it } from "vitest";

import { compareTracked, hasUpdate, updateFor, type TrackedApp } from "./types";

function tracked(overrides: Partial<TrackedApp> = {}): TrackedApp {
  return {
    key: "localsend",
    appId: "localsend",
    slug: "localsend",
    name: "LocalSend",
    sourceUrl: "https://github.com/localsend/localsend",
    source: "github",
    icon: null,
    developer: "LocalSend Team",
    platforms: ["android", "linux"],
    seenVersion: "1.16.0",
    latestVersion: "1.17.0",
    latestReleasedAt: "2026-09-04T09:20:00Z",
    addedAt: "2026-08-01T00:00:00Z",
    refreshedAt: "2026-09-04T09:20:00Z",
    pending: false,
    ...overrides,
  };
}

describe("updateFor", () => {
  it("reports an update when the latest version is newer", () => {
    const update = updateFor(tracked());
    expect(update).toEqual({
      app: expect.objectContaining({ key: "localsend" }),
      from: "1.16.0",
      to: "1.17.0",
      releasedAt: "2026-09-04T09:20:00Z",
    });
  });

  it("reports nothing when versions match", () => {
    expect(updateFor(tracked({ latestVersion: "1.16.0" }))).toBeNull();
  });

  it("never invents an update from an unknown version", () => {
    expect(updateFor(tracked({ seenVersion: null }))).toBeNull();
    expect(updateFor(tracked({ latestVersion: null }))).toBeNull();
    expect(updateFor(tracked({ seenVersion: null, latestVersion: null }))).toBeNull();
  });

  it("never reports an update for a source awaiting indexing", () => {
    expect(updateFor(tracked({ pending: true }))).toBeNull();
  });
});

describe("hasUpdate", () => {
  it("mirrors updateFor", () => {
    expect(hasUpdate(tracked())).toBe(true);
    expect(hasUpdate(tracked({ latestVersion: "1.16.0" }))).toBe(false);
  });
});

describe("compareTracked", () => {
  it("sorts pending sources last", () => {
    const pending = tracked({ key: "pending", pending: true });
    const ready = tracked({ key: "ready" });
    expect(compareTracked(ready, pending)).toBeLessThan(0);
  });

  it("sorts sources with updates first", () => {
    const stale = tracked({ key: "stale", latestVersion: "1.16.0" });
    const fresh = tracked({ key: "fresh" });
    expect(compareTracked(fresh, stale)).toBeLessThan(0);
  });

  it("breaks ties on most recently refreshed", () => {
    const older = tracked({ key: "a", refreshedAt: "2026-01-01T00:00:00Z" });
    const newer = tracked({ key: "b", refreshedAt: "2026-02-01T00:00:00Z" });
    expect(compareTracked(newer, older)).toBeLessThan(0);
  });

  it("is stable for identical entries", () => {
    expect(compareTracked(tracked(), tracked())).toBe(0);
  });
});
