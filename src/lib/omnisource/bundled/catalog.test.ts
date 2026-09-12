import { describe, expect, it } from "vitest";

import {
  bySlug,
  catalogStats,
  catalogCategory,
  catalogCollections,
  catalogDevelopers,
  listApps,
  recommendationsSimilar,
  securityFor,
  trendingApps,
  trustFor,
} from "./catalog";
import { bundledRoute } from "./router";
import { OmniSourceError } from "../client";

describe("bundled catalog", () => {
  it("exposes a populated catalog", () => {
    const stats = catalogStats();
    expect(stats.applications).toBeGreaterThan(0);
    expect(stats.categories).toBe(6);
    expect(stats.platforms).toBe(5);
  });

  it("resolves apps, trust, security and recommendations by slug", () => {
    const app = bySlug("localsend");
    expect(app?.name).toBe("LocalSend");
    expect(trustFor("localsend")?.app_id).toBe("localsend");
    expect(securityFor("localsend")?.status).toBe("passed");
    expect(recommendationsSimilar("localsend", 8).items.length).toBeGreaterThan(0);
  });

  it("supports search, filtering and pagination", () => {
    const password = listApps({ q: "password" });
    expect(password.items.map((a) => a.name)).toEqual(expect.arrayContaining(["KeePassXC", "Bitwarden"]));

    const android = listApps({ platform: "android" });
    expect(android.total).toBeGreaterThan(0);
    expect(android.items.every((a) => a.platforms.includes("android"))).toBe(true);

    const page = listApps({ per_page: "5", page: "2" });
    expect(page.items.length).toBe(5);
  });

  it("sorts by popularity for trending", () => {
    const apps = trendingApps();
    expect(apps.length).toBeGreaterThan(0);
    for (let i = 1; i < apps.length; i++) {
      expect(apps[i - 1]!.scores?.popularity ?? 0).toBeGreaterThanOrEqual(apps[i]!.scores?.popularity ?? 0);
    }
  });

  it("provides the full taxonomy", () => {
    expect(catalogCollections().length).toBeGreaterThan(0);
    expect(catalogDevelopers().length).toBeGreaterThan(0);
    expect(catalogCategory("security")).not.toBeNull();
    expect(catalogCategory("does-not-exist")).toBeNull();
  });

  it("routes wire paths and 404s on unknown resources", () => {
    expect(bundledRoute("GET", "/api/v1/stats", new URLSearchParams())).toHaveProperty("applications");
    expect(bundledRoute("GET", "/api/v1/apps/localsend", new URLSearchParams())).toHaveProperty("name", "LocalSend");
    expect(() => bundledRoute("GET", "/api/v1/apps/nope", new URLSearchParams())).toThrowError(OmniSourceError);
  });
});
