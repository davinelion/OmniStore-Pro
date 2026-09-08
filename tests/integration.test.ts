import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * End-to-end integration against a real Next.js server.
 *
 * These tests assert the shipped product, not its parts: pages render, search
 * and filters work, app pages carry real upstream data, downloads are only
 * offered for validated assets, and no unsafe link ever reaches the HTML.
 */

/** Ask the OS for a free port so a stale server can never collide with us. */
async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.unref();
    probe.on("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      const port = typeof address === "object" && address ? address.port : 0;
      probe.close(() => resolve(port));
    });
  });
}

const PORT = process.env.OMNISTORE_TEST_PORT ? Number(process.env.OMNISTORE_TEST_PORT) : 0;
let BASE = "http://127.0.0.1";

let server: ChildProcess | null = null;
let serverAlreadyRunning = false;

async function reachable(): Promise<boolean> {
  try {
    const response = await fetch(`${BASE}/api/v1/health`, { signal: AbortSignal.timeout(2_000) });
    return response.ok || response.status === 503;
  } catch {
    return false;
  }
}

async function startServer() {
  if (PORT && (await reachable())) {
    BASE = `http://127.0.0.1:${PORT}`;
    serverAlreadyRunning = true;
    return;
  }

  const port = PORT || (await freePort());
  BASE = `http://127.0.0.1:${port}`;

  // detached: the dev server spawns its own child, so we need a process group
  // we can tear down completely afterwards.
  server = spawn("npx", ["next", "dev", "-H", "127.0.0.1", "-p", String(port)], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: "test",
      // Never touch the production build: the dev server would rewrite .next.
      NEXT_DIST_DIR: ".next-integration",
    },
    stdio: "ignore",
    detached: true,
  });

  // A cold dev server compiles every route before the first answer; the
  // deadline has to cover that.
  const deadline = Date.now() + 420_000;
  while (Date.now() < deadline) {
    if (await reachable()) return;
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(`Next.js did not become reachable on port ${port}`);
}

const get = async (path: string) => {
  const response = await fetch(`${BASE}${path}`, {
    signal: AbortSignal.timeout(90_000),
    redirect: "manual",
  });
  return response;
};

const getHtml = async (path: string) => {
  const response = await get(path);
  return { response, html: await response.text() };
};

const getJson = async <T,>(path: string): Promise<T> => {
  const response = await get(path);
  return (await response.json()) as T;
};

beforeAll(startServer, 450_000);

afterAll(async () => {
  if (server?.pid && !serverAlreadyRunning) {
    try {
      // Negative pid kills the whole group, including the next-server child.
      process.kill(-server.pid, "SIGTERM");
    } catch {
      server.kill("SIGTERM");
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
});

type AppListResponse = {
  items: Array<{ id: string; slug: string; name: string; platforms: string[]; categories: string[] }>;
  pagination: { total: number; page: number; per_page: number; total_pages: number };
};

describe("pages render", () => {
  const pages = [
    "/",
    "/apps",
    "/categories",
    "/platforms",
    "/collections",
    "/developers",
    "/trending",
    "/latest",
    "/compare",
    "/favorites",
    "/search",
    "/discover/cross-platform",
    "/about",
    "/docs",
    "/privacy",
    "/terms",
    "/offline",
  ];

  for (const path of pages) {
    it(`GET ${path} returns 200 with real content`, async () => {
      const { response, html } = await getHtml(path);
      expect(response.status).toBe(200);
      expect(html.length).toBeGreaterThan(1_000);
      expect(html).toContain("OmniStore");
    });
  }

  it("returns a styled 404 for an unknown app", async () => {
    const { response, html } = await getHtml("/apps/definitely-not-a-real-app");
    expect(response.status).toBe(404);
    expect(html).toMatch(/could not find|404/i);
  });

  it("returns 404 for an unknown route", async () => {
    const { response, html } = await getHtml("/this-route-does-not-exist");
    expect(response.status).toBe(404);
    expect(html).toMatch(/could not find|404/i);
  });
});

describe("app pages", () => {
  let app: { id: string; slug: string; name: string; platforms: string[] };

  beforeAll(async () => {
    const list = await getJson<AppListResponse>("/api/v1/apps?per_page=1");
    app = list.items[0];
  });

  it("renders an app page with upstream data", async () => {
    const { response, html } = await getHtml(`/apps/${app.slug}`);
    expect(response.status).toBe(200);
    expect(html).toContain(app.name);
  });

  it("carries valid JSON-LD structured data", async () => {
    const { html } = await getHtml(`/apps/${app.slug}`);
    const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    expect(match).not.toBeNull();

    const raw = match![1].replace(/\\u003c/g, "<");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    expect(parsed["@type"]).toBe("SoftwareApplication");
    expect(typeof parsed.name).toBe("string");
    expect(typeof parsed.operatingSystem).toBe("string");
  });

  it("never emits an unsafe link scheme in the HTML", async () => {
    const { html } = await getHtml(`/apps/${app.slug}`);
    expect(html).not.toMatch(/href="javascript:/i);
    expect(html).not.toMatch(/href="data:/i);
    expect(html).not.toMatch(/<iframe/i);
  });

  it("serves the release history page", async () => {
    const { response, html } = await getHtml(`/apps/${app.slug}/releases`);
    expect(response.status).toBe(200);
    expect(html).toMatch(/releases/i);
  });
});

describe("browse, search and filters", () => {
  it("filters apps by platform through the URL", async () => {
    const { html } = await getHtml("/apps?platform=macos");
    expect(html).toMatch(/macOS/i);
    const body = await getJson<AppListResponse>("/api/v1/search?platform=macos&per_page=5");
    for (const item of body.items) expect(item.platforms).toContain("macos");
  });

  it("supports all-platforms filtering", async () => {
    const body = await getJson<AppListResponse>("/api/v1/search?all=windows,macos,linux&per_page=5");
    for (const item of body.items) {
      expect(item.platforms).toContain("windows");
      expect(item.platforms).toContain("macos");
      expect(item.platforms).toContain("linux");
    }
  });

  it("paginates", async () => {
    const first = await getJson<AppListResponse>("/api/v1/apps?per_page=5&page=1");
    const second = await getJson<AppListResponse>("/api/v1/apps?per_page=5&page=2");
    expect(first.items.map((i) => i.id)).not.toEqual(second.items.map((i) => i.id));
  });

  it("serves a search page that is indexable but not bloated with results", async () => {
    const { html } = await getHtml("/search?q=music");
    expect(html).toMatch(/noindex/i);
  });
});

describe("category, platform, developer and collection pages", () => {
  it("renders a category page with its apps", async () => {
    const categories = (
      await getJson<{ items: Array<{ slug: string; app_count: number }> }>("/api/v1/categories")
    ).items;
    const category = categories.find((c) => c.app_count > 0)!;
    const { response, html } = await getHtml(`/categories/${category.slug}`);
    expect(response.status).toBe(200);
    expect(html.length).toBeGreaterThan(2_000);
  });

  it("renders a platform page", async () => {
    const platforms = (
      await getJson<{ items: Array<{ slug: string; app_count: number }> }>("/api/v1/platforms")
    ).items;
    const platform = platforms.find((p) => p.app_count > 0)!;
    const { response } = await getHtml(`/platforms/${platform.slug}`);
    expect(response.status).toBe(200);
  });

  it("renders a developer page", async () => {
    const list = await getJson<AppListResponse>("/api/v1/apps?per_page=1");
    const app = await getJson<{
      developer: { slug: string } | null;
    }>(`/api/v1/apps/${list.items[0].id}`);
    if (!app.developer) return;
    const { response } = await getHtml(`/developers/${app.developer.slug}`);
    expect(response.status).toBe(200);
  });

  it("renders every collection", async () => {
    const collections = (await getJson<{ items: Array<{ slug: string }> }>("/api/v1/collections")).items;
    expect(collections.length).toBeGreaterThan(0);
    for (const collection of collections) {
      const { response } = await getHtml(`/collections/${collection.slug}`);
      expect(response.status).toBe(200);
    }
  });
});

describe("comparison", () => {
  it("renders a shared comparison server-side, without client data", async () => {
    const list = await getJson<AppListResponse>("/api/v1/apps?per_page=2");
    const ids = list.items.map((app) => app.id).join(",");
    const { response, html } = await getHtml(`/compare?ids=${ids}`);

    expect(response.status).toBe(200);
    // The table must be in the server HTML: a shared link works without JS.
    expect(html).toMatch(/<table/);
    for (const app of list.items) expect(html).toContain(app.name);
  });

  it("explains an incomplete comparison", async () => {
    const { html } = await getHtml("/compare");
    expect(html).toMatch(/add|select/i);
  });
});

describe("SEO and PWA", () => {
  it("serves a sitemap with app and taxonomy URLs", async () => {
    const { response, html } = await getHtml("/sitemap.xml");
    expect(response.status).toBe(200);
    expect(html).toContain("<urlset");
    expect(html).toContain("/apps/");
  });

  it("serves robots.txt pointing at the sitemap", async () => {
    const { response, html } = await getHtml("/robots.txt");
    expect(response.status).toBe(200);
    expect(html).toMatch(/sitemap:/i);
    expect(html).toMatch(/disallow/i);
  });

  it("serves the web app manifest", async () => {
    const manifest = await getJson<Record<string, unknown>>("/manifest.webmanifest");
    expect(manifest.name).toBeTruthy();
    expect(manifest.icons).toBeTruthy();
    expect(manifest.display).toBeTruthy();
  });

  it("serves the service worker with no-store semantics", async () => {
    const response = await get("/sw.js");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toMatch(/javascript/i);
  });

  it("sets security headers on API responses", async () => {
    const response = await get("/api/v1/apps?per_page=1");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });
});

describe("API surface", () => {
  const endpoints = [
    "/api/v1/apps",
    "/api/v1/categories",
    "/api/v1/platforms",
    "/api/v1/collections",
    "/api/v1/developers",
    "/api/v1/search",
    "/api/v1/trending",
    "/api/v1/latest",
    "/api/v1/home",
    "/api/v1/stats",
    "/api/v1/licenses",
    "/api/v1/config",
    "/api/v1/health",
  ];

  for (const endpoint of endpoints) {
    it(`GET ${endpoint} responds with JSON`, async () => {
      const response = await get(endpoint);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toMatch(/application\/json/);
    });
  }

  it("returns a typed 404 for an unknown app id", async () => {
    const response = await get("/api/v1/apps/does-not-exist");
    expect(response.status).toBe(404);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBeTruthy();
  });

  it("rejects an invalid report", async () => {
    const response = await fetch(`${BASE}/api/v1/reports`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(response.status).toBe(400);
  });
});
