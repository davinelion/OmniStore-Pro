import { describe, expect, it } from "vitest";

import {
  mapApp,
  mapCollection,
  mapSecurity,
  mapStats,
  mapTrust,
  AppDtoSchema,
  CollectionDtoSchema,
  SecurityResponseSchema,
  StatsDtoSchema,
  TrustResponseSchema,
} from "@omnistore/shared-models";

const APP_WIRE = {
  id: "localsend",
  slug: "localsend",
  name: "LocalSend",
  short_description: "Share files nearby",
  description: "Cross-platform file sharing.",
  icon: "https://example.com/icon.png",
  screenshots: ["https://example.com/1.png"],
  developer: { name: "LocalSend org", id: "localsend-org", slug: "localsend-org" },
  categories: ["utilities"],
  tags: ["sharing"],
  platforms: ["android", "linux", "toaster"],
  license: "Apache-2.0",
  open_source: true,
  source_name: "GitHub",
  homepage: "https://localsend.org",
  repository: "https://github.com/localsend/localsend",
  updated_at: "2026-09-01T00:00:00Z",
  scores: { trust: 91, quality: 80, popularity: 75 },
  latest_release: {
    version: "1.2.3",
    released_at: "2026-08-30T00:00:00Z",
    notes: "Bug fixes",
    assets: [
      {
        id: "a1",
        url: "https://example.com/app.apk",
        version: "1.2.3",
        platform: "android",
        architecture: "arm64",
        package_type: "apk",
        status: "VALID",
        size_bytes: 1024,
        sha256: "abc",
      },
    ],
  },
  releases: [],
  similar: ["joplin"],
};

describe("mapApp", () => {
  it("maps the validated wire payload into the domain model", () => {
    const dto = AppDtoSchema.parse(APP_WIRE);
    const app = mapApp(dto);
    expect(app.id).toBe("localsend");
    expect(app.trustScore).toBe(91);
    expect(app.platforms).toEqual(["android", "linux"]); // unknown platforms dropped
    expect(app.latestRelease?.assets[0]?.status).toBe("VALID");
    expect(app.latestRelease?.assets[0]?.architecture).toBe("arm64");
    expect(app.bundleId).toContain("github:localsend/localsend");
    expect(app.securityScore).toBeNull(); // owned by the security endpoint
  });

  it("never throws on sparse payloads", () => {
    const dto = AppDtoSchema.parse({ id: "x", slug: "x", name: "X" });
    const app = mapApp(dto);
    expect(app.name).toBe("X");
    expect(app.releases).toEqual([]);
    expect(app.category).toBe("");
  });
});

describe("mapStats", () => {
  it("normalizes backend stat names for the homepage", () => {
    const stats = mapStats(
      StatsDtoSchema.parse({
        applications: 30,
        releases: 1402,
        assets: 14034,
        sources: 3,
        platforms: 6,
        categories: 21,
      }),
    );
    expect(stats.apps).toBe(30);
    expect(stats.releases).toBe(1402);
    expect(stats.repositories).toBe(0);
    expect(stats.downloads).toBeNull();
  });
});

describe("mapTrust / mapSecurity", () => {
  it("keeps known badges and drops unknown ones", () => {
    const report = mapTrust(
      TrustResponseSchema.parse({
        app_id: "localsend",
        score: 89,
        factors: { open_source_license: 1, validated_assets: 0.9 },
        badges: ["verified", "trusted", "mystery_badge"],
        calculated_at: "2026-09-01T00:00:00Z",
      }),
    );
    expect(report.badges).toEqual(["verified", "trusted"]);
    expect(report.factors.validated_assets).toBeCloseTo(0.9);
  });

  it("maps scan evidence", () => {
    const report = mapSecurity(
      SecurityResponseSchema.parse({
        app_id: "localsend",
        security_score: 85,
        risk_score: 10,
        status: "passed",
        latest_scanned_at: "2026-09-01T00:00:00Z",
        scans: [
          {
            type: "metadata_integrity",
            status: "passed",
            confidence: 0.95,
            findings: [],
            vulnerabilities: [],
            scanned_at: "2026-09-01T00:00:00Z",
          },
        ],
      }),
    );
    expect(report.status).toBe("passed");
    expect(report.scans[0]?.status).toBe("passed");
  });
});

describe("mapCollection", () => {
  it("counts items from item_count or the items array", () => {
    const collection = mapCollection(
      CollectionDtoSchema.parse({
        id: "c1",
        slug: "featured",
        name: "Featured",
        description: null,
        item_count: 6,
      }),
    );
    expect(collection.itemCount).toBe(6);
    expect(collection.isPublic).toBe(true);
  });
});
