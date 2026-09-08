import { describe, expect, it } from "vitest";

import {
  AppSchema,
  AssetSchema,
  FeedSchema,
  isDownloadableAsset,
  assetStatusNote,
  ReleaseSchema,
} from "./omnisource";

/**
 * Schema hardening.
 *
 * OmniSource data is untrusted input: a hostile or buggy upstream must never be
 * able to crash the UI or inject a link scheme.
 */

const minimalApp = {
  id: "demo",
  slug: "demo",
  name: "Demo",
  summary: null,
  description: null,
  developer: null,
  license: null,
  open_source: true,
  active_development: null,
  icon_url: null,
  scores: {
    trust: { value: null, factors: [] },
    quality: { value: null, factors: [] },
    popularity: { value: null, factors: [] },
    algorithm: { name: "test", version: "1", disclaimer: "not a security guarantee" },
  },
  signals: {
    stars: null,
    forks: null,
    open_issues: null,
    watchers: null,
    repo_created_at: null,
    repo_pushed_at: null,
    release_count: null,
    first_release_at: null,
    last_release_at: null,
    release_cadence_days: null,
    archived: null,
  },
  links: { repository: null, homepage: null, documentation: null, releases: null, issue_tracker: null },
  source: { name: "GitHub", repo: null, url: null, status: "UNKNOWN", fetched_at: null },
  latest_release: null,
  created_at: null,
  updated_at: null,
} as const;

describe("AppSchema", () => {
  it("accepts a minimal payload and fills defaults", () => {
    const parsed = AppSchema.parse(minimalApp);
    expect(parsed.id).toBe("demo");
    expect(parsed.categories).toEqual([]);
    expect(parsed.releases).toEqual([]);
    expect(parsed.open_source).toBe(true);
  });

  it("accepts harmless new fields without failing", () => {
    const result = AppSchema.safeParse({ ...minimalApp, brandNewField: { nested: true } });
    expect(result.success).toBe(true);
  });

  it("rejects a missing stable id", () => {
    expect(AppSchema.safeParse({ slug: "demo", name: "Demo" }).success).toBe(false);
  });

  it("rejects an unknown platform instead of rendering it", () => {
    const result = AppSchema.safeParse({ ...minimalApp, platforms: ["nintendo-switch"] });
    expect(result.success).toBe(false);
  });

  it("rejects non-https links (javascript:, data:, http:)", () => {
    for (const url of [
      "javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "http://example.com/app.apk",
      "file:///etc/passwd",
      "blob:https://example.com/uuid",
    ]) {
      expect(AppSchema.safeParse({ ...minimalApp, links: { repository: url } }).success).toBe(false);
    }
  });

  it("accepts https links", () => {
    const result = AppSchema.safeParse({
      ...minimalApp,
      links: {
        ...minimalApp.links,
        repository: "https://example.com",
        homepage: "https://example.org",
      },
    });
    expect(result.success).toBe(true);
  });

  it("allows null for every optional upstream field", () => {
    const result = AppSchema.safeParse({
      ...minimalApp,
      active_development: null,
      latest_release: null,
      icon_url: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an out-of-range score", () => {
    const scores = {
      ...minimalApp.scores,
      trust: { value: 140, factors: [] },
    };
    expect(AppSchema.safeParse({ ...minimalApp, scores }).success).toBe(false);
  });
});

describe("AssetSchema", () => {
  const asset = {
    id: "a1",
    platform: "android",
    architecture: "arm64",
    package_type: "APK",
    version: "1.0.0",
    url: "https://example.com/app.apk",
    size_bytes: null,
    sha256: null,
    source: null,
    status: "VALID",
    status_note: null,
  };

  it("requires a url", () => {
    const { url, ...withoutUrl } = asset;
    expect(AssetSchema.safeParse(withoutUrl).success).toBe(false);
  });

  it("rejects non-https download urls", () => {
    expect(AssetSchema.safeParse({ ...asset, url: "http://example.com/app.apk" }).success).toBe(false);
    expect(AssetSchema.safeParse({ ...asset, url: "javascript:alert(1)" }).success).toBe(false);
  });

  it("rejects unknown package types", () => {
    expect(AssetSchema.safeParse({ ...asset, package_type: "WINGET" }).success).toBe(false);
  });

  it("defaults an unknown validation status to UNKNOWN", () => {
    const { status, ...withoutStatus } = asset;
    expect(AssetSchema.parse(withoutStatus).status).toBe("UNKNOWN");
  });
});

describe("ReleaseSchema", () => {
  it("keeps upstream markdown notes as inert text", () => {
    const release = {
      id: "r1",
      version: "1.0.0",
      tag: "v1.0.0",
      name: "1.0.0",
      released_at: "2026-01-01T00:00:00Z",
      notes: "<script>alert(1)</script> Fixed a crash",
      url: "https://example.com/release",
      assets: [],
    };
    // The schema stores the raw string; sanitisation happens at render time.
    expect(ReleaseSchema.parse(release).notes).toContain("<script>");
  });

  it("rejects a release without a version", () => {
    expect(ReleaseSchema.safeParse({ id: "r1", tag: null, name: null, released_at: null, notes: null, url: null, assets: [] }).success).toBe(false);
  });
});

describe("download safety", () => {
  const asset = (status: string) =>
    AssetSchema.parse({
      id: "a1",
      platform: "windows",
      architecture: "x86_64",
      package_type: "EXE",
      version: "1.0.0",
      url: "https://example.com/app.exe",
      size_bytes: 1024,
      sha256: null,
      source: null,
      status,
      status_note: null,
    });

  it("treats only VALID as downloadable", () => {
    expect(isDownloadableAsset(asset("VALID"))).toBe(true);
    expect(isDownloadableAsset(asset("INVALID"))).toBe(false);
    expect(isDownloadableAsset(asset("QUARANTINED"))).toBe(false);
    expect(isDownloadableAsset(asset("REVIEW_REQUIRED"))).toBe(false);
    expect(isDownloadableAsset(asset("UNKNOWN"))).toBe(false);
  });

  it("explains unavailable status without claiming safety", () => {
    expect(assetStatusNote(asset("UNKNOWN"))).toBe("Verification unavailable");
    expect(assetStatusNote(asset("QUARANTINED"))).toMatch(/not offered/i);
    expect(assetStatusNote(asset("VALID"))).toMatch(/verified/i);
  });
});

describe("FeedSchema", () => {
  it("rejects a feed whose apps are malformed", () => {
    const result = FeedSchema.safeParse({
      meta: { api_version: "1", generated_at: new Date().toISOString(), generator: "t", upstream: "t", app_count: 1 },
      apps: [{ id: "x" }],
    });
    expect(result.success).toBe(false);
  });
});
