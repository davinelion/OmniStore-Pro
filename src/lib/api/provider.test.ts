import { describe, expect, it } from "vitest";

import { getProvider } from "./index";
import { DEFAULT_FILTERS } from "@/lib/search/query";
import { isDownloadableAsset } from "@/lib/schemas/omnisource";

/**
 * Provider contract tests, run against the real ingested OmniSource feed.
 *
 * These assert the behaviour every surface (web today, native tomorrow) relies
 * on: stable ids, honest nulls, valid assets only, and consistent paging.
 */

const provider = getProvider();

describe("feed metadata", () => {
  it("reports when the data was generated", async () => {
    const meta = await provider.getFeedMeta();
    expect(Number.isNaN(Date.parse(meta.generated_at))).toBe(false);
    expect(meta.app_count).toBeGreaterThan(0);
  });
});

describe("getApps", () => {
  it("paginates consistently", async () => {
    const first = await provider.getApps({ ...DEFAULT_FILTERS, perPage: 10, page: 1 });
    const second = await provider.getApps({ ...DEFAULT_FILTERS, perPage: 10, page: 2 });

    expect(first.items).toHaveLength(10);
    expect(second.items).toHaveLength(10);
    expect(first.pagination.total).toBe(second.pagination.total);
    expect(second.pagination.total_pages).toBe(first.pagination.total_pages);

    const overlap = first.items.filter((app) => second.items.some((other) => other.id === app.id));
    expect(overlap).toHaveLength(0);
  });

  it("reports snapshot freshness", async () => {
    const result = await provider.getApps({ ...DEFAULT_FILTERS, perPage: 1 });
    expect(result.freshness).toBeTruthy();
    expect(Number.isNaN(Date.parse(result.freshness!))).toBe(false);
  });

  it("never returns an app without an id or slug", async () => {
    const result = await provider.getApps({ ...DEFAULT_FILTERS, perPage: 48 });
    for (const app of result.items) {
      expect(app.id).toBeTruthy();
      expect(app.slug).toBeTruthy();
      expect(app.name).toBeTruthy();
    }
  });
});

describe("search", () => {
  it("finds a known app by name", async () => {
    const result = await provider.search({ ...DEFAULT_FILTERS, q: "LocalSend" });
    expect(result.items.some((app) => app.slug === "localsend")).toBe(true);
  });

  it("returns an empty (not errored) result for nonsense", async () => {
    const result = await provider.search({ ...DEFAULT_FILTERS, q: "zzzqqqxxxnonexistent" });
    expect(result.items).toEqual([]);
    expect(result.pagination.total).toBe(0);
  });

  it("filters by platform", async () => {
    const result = await provider.search({ ...DEFAULT_FILTERS, platforms: ["macos"], perPage: 48 });
    expect(result.items.length).toBeGreaterThan(0);
    for (const app of result.items) expect(app.platforms).toContain("macos");
  });

  it("filters by all-platforms (AND) semantics", async () => {
    const result = await provider.search({
      ...DEFAULT_FILTERS,
      allPlatforms: ["windows", "macos", "linux"],
      perPage: 48,
    });
    expect(result.items.length).toBeGreaterThan(0);
    for (const app of result.items) {
      expect(app.platforms).toContain("windows");
      expect(app.platforms).toContain("macos");
      expect(app.platforms).toContain("linux");
    }
  });
});

describe("getApp", () => {
  it("resolves by slug and by id", async () => {
    const list = await provider.getApps({ ...DEFAULT_FILTERS, perPage: 1 });
    const app = list.items[0];
    const bySlug = await provider.getApp(app.slug);
    const byId = await provider.getApp(app.id);
    expect(bySlug?.id).toBe(app.id);
    expect(byId?.id).toBe(app.id);
  });

  it("returns null for an unknown app instead of throwing", async () => {
    expect(await provider.getApp("definitely-not-a-real-app")).toBeNull();
  });
});

describe("data honesty", () => {
  it("never exposes a non-https download url", async () => {
    const result = await provider.getApps({ ...DEFAULT_FILTERS, perPage: 48 });
    for (const app of result.items) {
      for (const release of app.releases) {
        for (const asset of release.assets) {
          expect(asset.url.startsWith("https://")).toBe(true);
        }
      }
    }
  });

  it("keeps unverified assets out of the downloadable set", async () => {
    const result = await provider.getApps({ ...DEFAULT_FILTERS, perPage: 48 });
    for (const app of result.items) {
      for (const asset of app.latest_release?.assets ?? []) {
        expect(isDownloadableAsset(asset)).toBe(asset.status === "VALID");
        if (asset.status === "VALID") expect(asset.url.startsWith("https://")).toBe(true);
      }
    }
  });

  it("publishes score factors, not just numbers", async () => {
    const result = await provider.getApps({ ...DEFAULT_FILTERS, perPage: 5 });
    for (const app of result.items) {
      expect(app.scores.trust.factors.length).toBeGreaterThan(0);
      expect(app.scores.algorithm.disclaimer.toLowerCase()).toContain("not a security");
    }
  });

  it("leaves screenshots empty rather than inventing them", async () => {
    const result = await provider.getApps({ ...DEFAULT_FILTERS, perPage: 48 });
    for (const app of result.items) {
      expect(Array.isArray(app.screenshots)).toBe(true);
      for (const shot of app.screenshots) expect(shot.url.startsWith("https://")).toBe(true);
    }
  });
});

describe("taxonomy", () => {
  it("lists categories, platforms and collections with real counts", async () => {
    const [categories, platforms, collections] = await Promise.all([
      provider.getCategories(),
      provider.getPlatforms(),
      provider.getCollections(),
    ]);
    expect(categories.length).toBeGreaterThan(0);
    expect(platforms.length).toBeGreaterThan(0);
    expect(collections.length).toBeGreaterThan(0);
    for (const category of categories) expect(category.app_count).toBeGreaterThanOrEqual(0);
  });

  it("resolves a collection and its apps", async () => {
    const collections = await provider.getCollections();
    const collection = await provider.getCollection(collections[0].slug);
    expect(collection?.collection.slug).toBe(collections[0].slug);
    expect(Array.isArray(collection?.apps)).toBe(true);
    expect(collection!.apps.length).toBeGreaterThan(0);
    expect(await provider.getCollection("nope-not-real")).toBeNull();
  });

  it("lists developers with app counts", async () => {
    const developers = await provider.getDevelopers();
    expect(developers.length).toBeGreaterThan(0);
    for (const developer of developers) expect(developer.app_count).toBeGreaterThan(0);
  });
});

describe("relationships", () => {
  it("returns alternatives and similar apps that exist", async () => {
    const list = await provider.getApps({ ...DEFAULT_FILTERS, perPage: 48 });
    const withAlternatives = list.items.find((app) => app.alternatives.length > 0);
    expect(withAlternatives).toBeTruthy();

    const alternatives = await provider.getAlternatives(withAlternatives!.slug);
    expect(alternatives.length).toBeGreaterThan(0);
    for (const alt of alternatives) {
      expect(alt.id).not.toBe(withAlternatives!.id);
      expect(alt.id).toBeTruthy();
    }

    const similar = await provider.getSimilar(withAlternatives!.slug);
    for (const app of similar) expect(app.id).not.toBe(withAlternatives!.id);
  });
});

describe("releases", () => {
  it("returns newest-first history with assets", async () => {
    const list = await provider.getApps({ ...DEFAULT_FILTERS, perPage: 24 });
    const app = list.items.find((candidate) => candidate.releases.length > 1) ?? list.items[0];
    const releases = await provider.getReleases(app.slug);
    expect(releases.length).toBeGreaterThan(0);

    const dates = releases.map((release) => (release.released_at ? Date.parse(release.released_at) : null));
    const dated = dates.filter((value): value is number => value !== null);
    expect([...dated].sort((a, b) => b - a)).toEqual(dated);
  });
});

describe("stats and home", () => {
  it("reports catalog stats", async () => {
    const stats = await provider.getStats();
    expect(stats.apps).toBeGreaterThan(0);
    expect(stats.releases).toBeGreaterThan(0);
    expect(stats.validatedAssets).toBeGreaterThan(0);
    expect(stats.developers).toBeGreaterThan(0);
  });

  it("builds the home payload", async () => {
    const home = await provider.getHome();
    expect(home.featured.length).toBeGreaterThan(0);
    expect(home.categories.length).toBeGreaterThan(0);
  });
});

describe("app ids are stable", () => {
  it("resolves the same app from a batch lookup", async () => {
    const list = await provider.getApps({ ...DEFAULT_FILTERS, perPage: 3 });
    const ids = list.items.map((app) => app.id);
    const batch = await provider.getAppsByIds(ids);
    expect(batch.map((app) => app.id)).toEqual(ids);
  });

  it("ignores unknown ids", async () => {
    const batch = await provider.getAppsByIds(["not-a-real-id"]);
    expect(batch).toEqual([]);
  });
});
