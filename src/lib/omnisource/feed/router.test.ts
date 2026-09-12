/**
 * Bundled-feed router — the fallback OmniSource v1 data path.
 *
 * These tests run against the real `data/omnisource-feed.json` rather than a
 * fixture: the point of the bundled feed is that a deploy with no configuration
 * serves the catalog, so the tests must prove *that file* satisfies the
 * contract, not that a hand-made fixture does.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { FeedRequestError, serveFeedRequest } from "./router";
import { isFeedLoaded, loadFeed, resetFeedCache } from "./catalog";
import {
  AppDtoSchema,
  CollectionDtoSchema,
  PaginatedAppsDtoSchema,
  RecommendationResponseSchema,
  SecurityResponseSchema,
  TrustResponseSchema,
  mapApp,
} from "@omnistore/shared-models";

interface PaginatedApps {
  items: Array<Record<string, unknown>>;
  total: number;
  page: number | null;
}

async function get<T>(path: string): Promise<T> {
  return (await serveFeedRequest(path)) as T;
}

beforeEach(async () => {
  await loadFeed();
});

describe("catalog loading", () => {
  it("loads a non-empty catalog from the bundled feed file", async () => {
    const feed = await loadFeed();
    expect(feed.apps.length).toBeGreaterThan(100);
    expect(feed.generated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(isFeedLoaded()).toBe(true);
  });

  it("reports readiness before and after a reset", async () => {
    expect(isFeedLoaded()).toBe(true);
    resetFeedCache();
    expect(isFeedLoaded()).toBe(false);
    await loadFeed();
    expect(isFeedLoaded()).toBe(true);
  });
});

describe("GET /stats", () => {
  it("counts the catalog consistently with the apps it serves", async () => {
    const stats = await get<Record<string, number>>("/stats");
    const apps = await get<PaginatedApps>("/apps?per_page=1");
    expect(stats.applications).toBe(apps.total);
    expect(stats.applications).toBeGreaterThan(100);
    expect(stats.categories).toBeGreaterThan(0);
    expect(stats.platforms).toBeGreaterThan(0);
  });
});

describe("GET /apps", () => {
  it("paginates with a stable total", async () => {
    const first = await get<PaginatedApps>("/apps?page=1&per_page=5");
    const second = await get<PaginatedApps>("/apps?page=2&per_page=5");
    expect(first.items).toHaveLength(5);
    expect(second.items).toHaveLength(5);
    expect(first.total).toBe(second.total);
    expect(first.items[0]!.id).not.toBe(second.items[0]!.id);
    expect(first.page).toBe(1);
  });

  it("caps per_page so one request cannot dump the catalog", async () => {
    const page = await get<PaginatedApps>("/apps?per_page=100000");
    expect(page.items.length).toBeLessThanOrEqual(100);
  });

  it("filters by platform", async () => {
    const page = await get<PaginatedApps>("/apps?platform=linux&per_page=100");
    expect(page.items.length).toBeGreaterThan(0);
    for (const item of page.items) {
      expect(item.platforms as string[]).toContain("linux");
    }
  });

  it("treats a comma-separated platform list as any-of", async () => {
    const linux = await get<PaginatedApps>("/apps?platform=linux&per_page=100");
    const both = await get<PaginatedApps>("/apps?platform=linux,macos&per_page=100");
    expect(both.total).toBeGreaterThanOrEqual(linux.total);
  });

  it("filters by category", async () => {
    const page = await get<PaginatedApps>("/apps?category=development&per_page=100");
    expect(page.items.length).toBeGreaterThan(0);
    for (const item of page.items) {
      expect(item.categories as string[]).toContain("development");
    }
  });

  it("honours min_trust", async () => {
    const page = await get<PaginatedApps>("/apps?min_trust=90&per_page=100");
    for (const item of page.items) {
      expect((item.scores as { trust: number }).trust).toBeGreaterThanOrEqual(90);
    }
  });

  it("sorts by name alphabetically", async () => {
    const page = await get<PaginatedApps>("/apps?sort=name&per_page=50");
    const names = page.items.map((item) => String(item.name));
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it("sorts by popularity descending", async () => {
    const page = await get<PaginatedApps>("/apps?sort=popularity&per_page=25");
    const scores = page.items.map((item) => (item.scores as { popularity: number }).popularity);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });

  it("returns every app payload in valid v1 shape", async () => {
    const page = await get<PaginatedApps>("/apps?per_page=100");
    for (const item of page.items) {
      expect(AppDtoSchema.safeParse(item).success).toBe(true);
    }
  });

  it("does not leak ingest-only signals through the DTO contract", async () => {
    const page = await get<PaginatedApps>("/apps?per_page=20");
    const mapped = PaginatedAppsDtoSchema.parse(page).items.map(mapApp);
    expect(mapped[0]).toBeDefined();
    expect(JSON.stringify(mapped[0])).not.toContain("_signals");
    expect(JSON.stringify(mapped[0])).not.toContain("_featured");
  });
});

describe("GET /apps/{id}", () => {
  it("resolves an app by slug", async () => {
    const list = await get<PaginatedApps>("/apps?per_page=1");
    const slug = String(list.items[0]!.slug);
    const app = await get<Record<string, unknown>>(`/apps/${slug}`);
    expect(app.slug).toBe(slug);
    expect(AppDtoSchema.safeParse(app).success).toBe(true);
  });

  it("404s for an unknown app with a typed error", async () => {
    await expect(get("/apps/definitely-not-a-real-app")).rejects.toMatchObject({
      name: "FeedRequestError",
      status: 404,
      code: "not_found",
    });
  });
});

describe("GET /search", () => {
  it("ranks an exact name match first", async () => {
    const page = await get<PaginatedApps>("/search?q=blender&per_page=10");
    expect(page.items.length).toBeGreaterThan(0);
    expect(String(page.items[0]!.name).toLowerCase()).toContain("blender");
  });

  it("matches on tags and description, not just the name", async () => {
    const page = await get<PaginatedApps>("/search?q=password-manager&per_page=20");
    expect(page.items.length).toBeGreaterThan(0);
  });

  it("requires every term to match", async () => {
    const page = await get<PaginatedApps>(
      "/search?q=terminal%20zzzznotarealtoken&per_page=10",
    );
    expect(page.total).toBe(0);
  });

  it("tolerates a one-character typo in an app name", async () => {
    // "bitwarden" misspelt by a single transposition-free edit.
    const page = await get<PaginatedApps>("/search?q=bitwardn&per_page=10");
    expect(page.items.length).toBeGreaterThan(0);
    expect(String(page.items[0]!.name).toLowerCase()).toContain("bitwarden");
  });

  it("with no query it still returns a valid paginated page", async () => {
    const page = await get<PaginatedApps>("/search?per_page=5");
    expect(PaginatedAppsDtoSchema.safeParse(page).success).toBe(true);
    expect(page.items.length).toBeGreaterThan(0);
  });

  it("combines a query with filters", async () => {
    const page = await get<PaginatedApps>("/search?q=note&platform=linux&per_page=50");
    for (const item of page.items) {
      expect(item.platforms as string[]).toContain("linux");
    }
  });
});

describe("trending and latest", () => {
  it("serves trending as a bare app array", async () => {
    const trending = (await get("/trending")) as Array<Record<string, unknown>>;
    expect(Array.isArray(trending)).toBe(true);
    expect(trending.length).toBeGreaterThan(0);
    const scores = trending.map((a) => (a.scores as { popularity: number }).popularity);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });

  it("serves latest ordered by most recent release", async () => {
    const latest = (await get("/latest")) as Array<{ latest_release: { released_at: string | null } | null }>;
    const dates = latest
      .map((a) => (a.latest_release?.released_at ? Date.parse(a.latest_release.released_at) : 0));
    expect(dates).toEqual([...dates].sort((a, b) => b - a));
  });
});

describe("taxonomy", () => {
  it("lists categories with real app counts", async () => {
    const categories = (await get("/categories")) as Array<{ slug: string; name: string }>;
    expect(categories.length).toBeGreaterThan(0);
    const detail = (await get(
      `/categories/${categories[0]!.slug}`,
    )) as { app_count: number };
    expect(detail.app_count).toBeGreaterThan(0);
  });

  it("lists platforms with counts matching the app index", async () => {
    const platforms = (await get("/platforms")) as Array<{ platform_type: string; app_count: number }>;
    expect(platforms.length).toBeGreaterThan(0);
    for (const platform of platforms) {
      const page = await get<PaginatedApps>(`/apps?platform=${platform.platform_type}&per_page=1`);
      expect(platform.app_count).toBe(page.total);
    }
  });

  it("404s for an unknown category", async () => {
    await expect(get("/categories/not-a-category")).rejects.toBeInstanceOf(FeedRequestError);
  });
});

describe("collections", () => {
  it("lists summaries without attaching apps", async () => {
    const list = (await get("/collections?page=1&per_page=100")) as {
      items: Array<Record<string, unknown>>;
      total: number;
    };
    expect(list.items.length).toBeGreaterThan(0);
    for (const item of list.items) {
      expect(item.items).toBeUndefined();
      expect(item.item_count).toBeGreaterThan(0);
      expect(CollectionDtoSchema.safeParse(item).success).toBe(true);
    }
  });

  it("resolves detail by slug and by id, with its apps attached", async () => {
    const list = (await get("/collections?page=1&per_page=100")) as {
      items: Array<{ id: string; slug: string; item_count: number }>;
    };
    const summary = list.items[0]!;
    for (const key of [summary.slug, summary.id]) {
      const detail = (await get(`/collections/${key}`)) as { items: unknown[]; name: string };
      expect(detail.items.length).toBe(summary.item_count);
      expect(detail.name).toBeTruthy();
    }
  });

  it("includes the well-known 'featured' collection the homepage renders", async () => {
    const detail = (await get("/collections/featured")) as { items: unknown[] };
    expect(detail.items.length).toBeGreaterThan(0);
  });
});

describe("developers", () => {
  it("lists developer records in the v1 wire shape", async () => {
    const developers = (await get("/developers?limit=10")) as Array<{
      developer_id: string;
      slug: string;
      name: string;
    }>;
    expect(developers.length).toBeGreaterThan(0);
    expect(developers[0]!.developer_id).toBeTruthy();
  });

  it("serves a developer profile and their apps via the apps index", async () => {
    const developers = (await get("/developers?limit=5")) as Array<{ developer_id: string }>;
    const id = developers[0]!.developer_id;
    const profile = (await get(`/developers/${id}`)) as { app_count: number; display_name: string };
    expect(profile.display_name).toBeTruthy();
    const apps = await get<PaginatedApps>(`/apps?developer=${id}&per_page=100`);
    expect(apps.total).toBe(profile.app_count);
  });

  it("404s for an unknown developer", async () => {
    await expect(get("/developers/no-such-developer")).rejects.toBeInstanceOf(FeedRequestError);
  });
});

describe("recommendations", () => {
  it("returns related apps for a known subject, excluding the subject", async () => {
    const list = await get<PaginatedApps>("/apps?per_page=1");
    const id = String(list.items[0]!.id);
    const response = await get<{
      subject_app_id: string | null;
      items: Array<{ app: { id: string }; reasons: string[] }>;
    }>(`/recommendations?app_id=${id}&limit=6`);
    expect(response.subject_app_id).toBe(id);
    expect(response.items.length).toBeGreaterThan(0);
    expect(response.items.length).toBeLessThanOrEqual(6);
    for (const item of response.items) {
      expect(item.app.id).not.toBe(id);
      expect(item.reasons.length).toBeGreaterThan(0);
    }
    expect(RecommendationResponseSchema.safeParse(response).success).toBe(true);
  });

  it("404s for an unknown subject so callers can fall back", async () => {
    await expect(get("/recommendations?app_id=nope&limit=4")).rejects.toBeInstanceOf(
      FeedRequestError,
    );
  });

  it("serves catalog-wide trending with explainable reasons", async () => {
    const response = (await get("/recommendations/trending?limit=5")) as {
      subject_app_id: string | null;
      items: Array<{ kind: string; reasons: string[] }>;
    };
    expect(response.subject_app_id).toBeNull();
    expect(response.items.length).toBe(5);
    expect(response.items.every((item) => item.kind === "trending")).toBe(true);
  });

  it("serves discovery sorted by newest release, and only apps that have one", async () => {
    const response = (await get("/recommendations/discover?sort=new&limit=8")) as {
      items: Array<{ app: { latest_release: { released_at: string | null } | null } }>;
    };
    expect(response.items.length).toBe(8);
    for (const item of response.items) {
      expect(item.app.latest_release).not.toBeNull();
    }
    const dates = response.items.map((item) =>
      Date.parse(item.app.latest_release!.released_at!),
    );
    expect(dates).toEqual([...dates].sort((a, b) => b - a));
  });
});

describe("trust and security", () => {
  it("exposes numeric trust factors that back the score", async () => {
    const list = await get<PaginatedApps>("/apps?min_trust=80&per_page=1");
    const id = String(list.items[0]!.id);
    const trust = (await get(`/trust/${id}`)) as Record<string, unknown>;
    expect(TrustResponseSchema.safeParse(trust).success).toBe(true);
    const factors = trust.factors as Record<string, number>;
    expect(Object.keys(factors).length).toBeGreaterThan(0);
    for (const value of Object.values(factors)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it("never claims a vulnerability scan that was not run", async () => {
    const list = await get<PaginatedApps>("/apps?per_page=25");
    for (const item of list.items) {
      const security = await get(`/security/${String(item.id)}`);
      const parsed = SecurityResponseSchema.parse(security);
      for (const scan of parsed.scans) {
        // The bundled feed runs metadata checks only — it must not report
        // vulnerabilities it never looked for.
        expect(scan.vulnerabilities).toEqual([]);
      }
      // Scan names state what was actually checked.
      const types = parsed.scans.map((scan) => scan.type);
      expect(types).toContain("metadata_integrity");
      expect(types.some((type) => /vulnerability|cve|malware/.test(type))).toBe(false);
    }
  });

  it("keeps security and risk scores complementary", async () => {
    const list = await get<PaginatedApps>("/apps?per_page=10");
    for (const item of list.items) {
      const security = SecurityResponseSchema.parse(
        await get(`/security/${String(item.id)}`),
      );
      expect(security.security_score + security.risk_score).toBe(100);
    }
  });
});

describe("unknown routes", () => {
  it("404s rather than throwing an untyped error", async () => {
    await expect(get("/not-a-real-endpoint")).rejects.toMatchObject({
      status: 404,
      code: "not_found",
    });
  });
});
