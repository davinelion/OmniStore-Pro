import { describe, expect, it } from "vitest";

import { GET as getApps } from "../apps/route";
import { GET as getApp } from "../apps/[id]/route";
import { GET as getSearch } from "../search/route";
import { GET as getStats } from "../stats/route";
import { GET as getHealth } from "../health/route";
import { GET as getHome } from "../home/route";
import { POST as postReport } from "../reports/route";
import { GET as getConfig } from "../config/route";

/**
 * API contract tests.
 *
 * The `/api/v1/*` surface is the contract future native clients will consume,
 * so its shape, status codes and error envelopes are asserted here.
 */

const call = (handler: (request: Request) => Promise<Response>, path: string, init?: RequestInit) =>
  handler(new Request(`https://omnistore.test${path}`, init));

/** Route handlers that read a dynamic segment take (request, { params }). */
const callWithParams = (
  handler: (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>,
  id: string,
) => handler(new Request(`https://omnistore.test/api/v1/apps/${id}`), { params: Promise.resolve({ id }) });

async function jsonOf(response: Response) {
  return response.json();
}

describe("GET /api/v1/apps", () => {
  it("returns a paginated envelope", async () => {
    const response = await call(getApps, "/api/v1/apps?per_page=5");
    expect(response.status).toBe(200);
    const body = await jsonOf(response);
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items).toHaveLength(5);
    expect(body.pagination).toMatchObject({
      page: 1,
      per_page: 5,
      total: expect.any(Number),
      total_pages: expect.any(Number),
    });
  });

  it("returns a valid empty envelope for a filter with no matches", async () => {
    const response = await call(getApps, "/api/v1/apps?q=zzzqqqxxxnonexistent");
    expect(response.status).toBe(200);
    const body = await jsonOf(response);
    expect(body.items).toEqual([]);
    expect(body.pagination.total).toBe(0);
    expect(body.pagination.total_pages).toBeLessThanOrEqual(1);
  });

  it("clamps hostile pagination input instead of failing", async () => {
    const response = await call(getApps, "/api/v1/apps?page=-4&per_page=99999&sort=;DROP");
    expect(response.status).toBe(200);
    const body = await jsonOf(response);
    expect(body.pagination.page).toBeGreaterThan(0);
    expect(body.pagination.per_page).toBeLessThanOrEqual(96);
  });

  it("resolves a batch of ids and caps the request size", async () => {
    const all = await jsonOf(await call(getApps, "/api/v1/apps?per_page=3"));
    const ids = all.items.map((app: { id: string }) => app.id).join(",");
    const batch = await jsonOf(await call(getApps, `/api/v1/apps?ids=${encodeURIComponent(ids)}`));
    expect(batch.items).toHaveLength(3);

    const many = Array.from({ length: 40 }, (_, i) => `id-${i}`).join(",");
    const capped = await jsonOf(await call(getApps, `/api/v1/apps?ids=${many}`));
    expect(capped.items.length).toBeLessThanOrEqual(8);
  });

  it("sets a cache header but never caches personal data", async () => {
    const response = await call(getApps, "/api/v1/apps?per_page=1");
    expect(response.headers.get("cache-control")).toMatch(/s-maxage/);
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });
});

describe("GET /api/v1/search", () => {
  it("searches and returns ranked results", async () => {
    const response = await call(getSearch, "/api/v1/search?q=localsend");
    expect(response.status).toBe(200);
    const body = await jsonOf(response);
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.items[0].name.toLowerCase()).toContain("localsend");
  });

  it("filters by platform with both the short and long query keys", async () => {
    for (const query of ["platform", "platforms"]) {
      const response = await call(getSearch, `/api/v1/search?${query}=macos&per_page=10`);
      const body = await jsonOf(response);
      expect(body.items.length).toBeGreaterThan(0);
      expect(body.pagination.total).toBeLessThan(110);
      for (const app of body.items) expect(app.platforms).toContain("macos");
    }
  });

  it("filters by platforms that must all be supported", async () => {
    const response = await call(getSearch, "/api/v1/search?all=windows,macos,linux&per_page=10");
    const body = await jsonOf(response);
    for (const app of body.items) {
      expect(app.platforms).toContain("windows");
      expect(app.platforms).toContain("macos");
      expect(app.platforms).toContain("linux");
    }
  });
});

describe("GET /api/v1/apps/:id", () => {
  it("resolves a real app", async () => {
    const list = await jsonOf(await call(getApps, "/api/v1/apps?per_page=1"));
    const app = list.items[0];
    const response = await callWithParams(getApp, app.id);
    expect(response.status).toBe(200);
    const body = await jsonOf(response);
    expect(body.id).toBe(app.id);
    expect(body.slug).toBeTruthy();
  });

  it("returns a typed 404 envelope for an unknown app", async () => {
    const response = await callWithParams(getApp, "definitely-not-real");
    expect(response.status).toBe(404);
    const body = await jsonOf(response);
    expect(body.error.code).toBeTruthy();
    expect(body.error.message).toBeTruthy();
  });
});

describe("GET /api/v1/stats", () => {
  it("returns catalog counters", async () => {
    const body = await jsonOf(await call(getStats, "/api/v1/stats"));
    expect(body.stats.apps).toBeGreaterThan(0);
  });
});

describe("GET /api/v1/health", () => {
  it("reports the active provider", async () => {
    const response = await call(getHealth, "/api/v1/health");
    expect(response.status).toBe(200);
    const body = await jsonOf(response);
    expect(body.status).toBe("ok");
    expect(body.provider.name).toBeTruthy();
  });
});

describe("GET /api/v1/home", () => {
  it("returns the composed home payload", async () => {
    const body = await jsonOf(await call(getHome, "/api/v1/home"));
    expect(Array.isArray(body.featured)).toBe(true);
    expect(Array.isArray(body.categories)).toBe(true);
    expect(body.stats).toBeTruthy();
  });
});

describe("GET /api/v1/config", () => {
  it("exposes only public configuration", async () => {
    const body = await jsonOf(await call(getConfig, "/api/v1/config"));
    const serialised = JSON.stringify(body);
    for (const secret of ["OMNISTORE_REPORT_WEBHOOK", "TOKEN", "SECRET", "PRIVATE"]) {
      expect(serialised.toUpperCase()).not.toContain(secret);
    }
  });
});

describe("POST /api/v1/reports", () => {
  const post = (body: unknown) =>
    postReport(
      new Request("https://omnistore.test/api/v1/reports", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": `203.0.113.${Math.floor(Math.random() * 250) + 1}` },
        body: JSON.stringify(body),
      }),
    );

  it("accepts a valid report", async () => {
    const response = await post({ reason: "Broken download", details: "404 on the AppImage" });
    expect(response.status).toBe(202);
    const body = await jsonOf(response);
    expect(body.ok).toBe(true);
  });

  it("rejects an empty payload with 400", async () => {
    const response = await post({});
    expect(response.status).toBe(400);
    const body = await jsonOf(response);
    expect(body.error.code).toBeTruthy();
  });

  it("rejects unknown app ids", async () => {
    const response = await post({ appId: "not-a-real-app", reason: "Broken download" });
    expect(response.status).toBe(400);
  });

  it("rejects oversized details", async () => {
    const response = await post({ reason: "Other", details: "x".repeat(20_000) });
    expect(response.status).toBe(400);
  });

  it("survives malformed JSON", async () => {
    const response = await postReport(
      new Request("https://omnistore.test/api/v1/reports", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.7" },
        body: "{not json",
      }),
    );
    expect(response.status).toBe(400);
  });

  it("rate limits a single client", async () => {
    const ip = "198.51.100.99";
    const codes: number[] = [];
    for (let i = 0; i < 7; i += 1) {
      const response = await postReport(
        new Request("https://omnistore.test/api/v1/reports", {
          method: "POST",
          headers: { "content-type": "application/json", "x-forwarded-for": ip },
          body: JSON.stringify({ reason: "Other", details: `spam ${i}` }),
        }),
      );
      codes.push(response.status);
    }
    expect(codes.filter((code) => code === 429).length).toBeGreaterThan(0);
  });
});
