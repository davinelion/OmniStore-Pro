import { describe, expect, it } from "vitest";

import { getProvider } from "@/lib/api";
import { DEFAULT_FILTERS, runSearch } from "@/lib/search/query";
import { sanitizeMarkdown } from "@/lib/security/urls";
import { buildApp } from "@/test/factories";
import type { App } from "@/lib/schemas/omnisource";

/**
 * Performance budgets.
 *
 * Search and filtering run on the server for indexed pages and in the browser
 * for live search, so a slow query is a slow page. These budgets are generous
 * (CI hardware is slow) but they catch algorithmic regressions.
 */

function syntheticCatalog(size: number): App[] {
  const platforms = ["ios", "android", "windows", "macos", "linux"] as const;
  return Array.from({ length: size }, (_, index) =>
    buildApp({
      id: `app-${index}`,
      slug: `app-${index}`,
      name: `Synthetic App ${index}`,
      summary: `Synthetic app number ${index} used to measure search performance`,
      categories: [["utilities", "audio", "video", "security", "ai"][index % 5]],
      platforms: [platforms[index % platforms.length], platforms[(index + 1) % platforms.length]],
      stars: index * 7,
      lastReleaseAt: new Date(Date.now() - index * 3_600_000).toISOString(),
    }),
  );
}

describe("search performance", () => {
  it("searches a 2,000 app catalog within budget", () => {
    const apps = syntheticCatalog(2_000);
    const start = performance.now();
    for (let i = 0; i < 20; i += 1) {
      runSearch(apps, { ...DEFAULT_FILTERS, q: `app ${i}`, perPage: 24 });
    }
    const elapsed = performance.now() - start;
    expect(elapsed / 20).toBeLessThan(120); // ms per query
  });

  it("filters, sorts and pages a large catalog within budget", () => {
    const apps = syntheticCatalog(2_000);
    const start = performance.now();
    for (let page = 1; page <= 10; page += 1) {
      runSearch(apps, {
        ...DEFAULT_FILTERS,
        platforms: ["windows"],
        categories: ["audio"],
        sort: "trust",
        page,
        perPage: 24,
      });
    }
    expect(performance.now() - start).toBeLessThan(1_200);
  });

  it("handles a pathological query without exploding", () => {
    const apps = syntheticCatalog(1_000);
    const start = performance.now();
    const result = runSearch(apps, { ...DEFAULT_FILTERS, q: "a".repeat(200) });
    expect(performance.now() - start).toBeLessThan(400);
    expect(result.items.length).toBeLessThanOrEqual(24);
  });
});

describe("provider performance", () => {
  it("answers a catalog query quickly and caches the feed parse", async () => {
    const provider = getProvider();

    const coldStart = performance.now();
    await provider.getApps({ ...DEFAULT_FILTERS, perPage: 24 });
    const cold = performance.now() - coldStart;

    const warmStart = performance.now();
    for (let i = 0; i < 20; i += 1) {
      await provider.getApps({ ...DEFAULT_FILTERS, perPage: 24, page: 1 });
    }
    const warm = (performance.now() - warmStart) / 20;

    expect(cold).toBeLessThan(4_000);
    expect(warm).toBeLessThan(120);
  });

  it("composes the home payload within budget", async () => {
    const provider = getProvider();
    const start = performance.now();
    await provider.getHome();
    expect(performance.now() - start).toBeLessThan(2_000);
  });
});

describe("rendering input preparation", () => {
  it("sanitises a large batch of release notes within budget", () => {
    const notes = Array.from(
      { length: 500 },
      (_, i) =>
        `## Release ${i}\n- Fixed <script>alert(${i})</script>\n- [changelog](javascript:alert(1))\n- \`code\` **bold**`,
    ).join("\n\n");

    const start = performance.now();
    for (let i = 0; i < 20; i += 1) sanitizeMarkdown(notes);
    const elapsed = (performance.now() - start) / 20;

    expect(elapsed).toBeLessThan(200);
    const cleaned = sanitizeMarkdown(notes);
    expect(cleaned).not.toMatch(/<script|javascript:/i);
  });
});
