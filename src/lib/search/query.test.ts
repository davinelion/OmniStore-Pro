import { describe, expect, it } from "vitest";

import {
  DEFAULT_FILTERS,
  MAX_PER_PAGE,
  SORT_KEYS,
  editDistance,
  filterApps,
  filtersToQuery,
  normaliseText,
  parseFilters,
  paginate,
  runSearch,
  searchApps,
  sortApps,
  tokenize,
  withFilterChange,
} from "./query";
import type { App } from "@/lib/schemas/omnisource";

function app(overrides: Partial<App> & { id: string; name: string }): App {
  return {
    slug: overrides.id,
    summary: null,
    description: null,
    features: [],
    developer: null,
    categories: [],
    tags: [],
    platforms: [],
    architectures: [],
    package_types: [],
    license: null,
    open_source: true,
    active_development: true,
    icon_url: null,
    screenshots: [],
    scores: {
      trust: { value: 80, factors: [] },
      quality: { value: 70, factors: [] },
      popularity: { value: 50, factors: [] },
      algorithm: { name: "test", version: "1", disclaimer: "d" },
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
    releases: [],
    alternatives: [],
    similar: [],
    created_at: null,
    updated_at: null,
    ...overrides,
  } as App;
}

const apps: App[] = [
  app({
    id: "spotube",
    name: "Spotube",
    summary: "Open-source Spotify client",
    description: "Music streaming without ads.",
    categories: ["audio"],
    tags: ["music", "spotify"],
    platforms: ["android", "windows", "linux"],
  }),
  app({
    id: "navidrome",
    name: "Navidrome",
    summary: "Music server and streamer",
    categories: ["audio"],
    tags: ["music", "server"],
    platforms: ["linux", "windows"],
    scores: {
      trust: { value: 90, factors: [] },
      quality: { value: 88, factors: [] },
      popularity: { value: 95, factors: [] },
      algorithm: { name: "t", version: "1", disclaimer: "d" },
    },
  }),
  app({
    id: "gimp",
    name: "GIMP",
    summary: "Image editor",
    categories: ["photography"],
    tags: ["image", "editor"],
    platforms: ["linux", "macos"],
  }),
  app({
    id: "keepassxc",
    name: "KeePassXC",
    summary: "Password manager",
    categories: ["security"],
    tags: ["password", "vault"],
    platforms: ["windows", "macos", "linux"],
    license: { id: "GPL-3.0", name: "GNU GPL v3", url: null, osi_approved: true },
  }),
];

describe("tokenize / normaliseText", () => {
  it("lowercases and splits on punctuation", () => {
    expect(tokenize("Music, Player!")).toEqual(["music", "player"]);
  });

  it("strips diacritics", () => {
    expect(normaliseText("Übermensch")).toBe("ubermensch");
  });
});

describe("editDistance", () => {
  it("is zero for equal strings", () => {
    expect(editDistance("music", "music")).toBe(0);
  });

  it("measures small typos", () => {
    expect(editDistance("spotify", "spotfy")).toBe(1);
  });

  it("bails out beyond the max", () => {
    expect(editDistance("music", "zzzzzzzzzz", 2)).toBeGreaterThan(2);
  });
});

describe("searchApps", () => {
  it("ranks exact name matches first", () => {
    expect(searchApps(apps, "spotube")[0].id).toBe("spotube");
  });

  it("matches synonyms (music -> audio apps)", () => {
    const ids = searchApps(apps, "music").map((a) => a.id);
    expect(ids).toContain("spotube");
    expect(ids).toContain("navidrome");
    expect(ids).not.toContain("keepassxc");
  });

  it("tolerates typos", () => {
    expect(searchApps(apps, "spotfy").map((a) => a.id)).toContain("spotube");
  });

  it("matches partial words", () => {
    expect(searchApps(apps, "pass").map((a) => a.id)).toContain("keepassxc");
  });

  it("searches developers, categories, tags, platforms and licences", () => {
    expect(searchApps(apps, "audio").map((a) => a.id)).toContain("spotube");
    expect(searchApps(apps, "linux").length).toBeGreaterThan(0);
    expect(searchApps(apps, "GPL-3.0").map((a) => a.id)).toContain("keepassxc");
  });

  it("returns everything for an empty query", () => {
    expect(searchApps(apps, "")).toHaveLength(apps.length);
  });

  it("returns nothing for a nonsense query", () => {
    expect(searchApps(apps, "zzzzqqqqxxxx")).toHaveLength(0);
  });
});

describe("filterApps", () => {
  const filters = { ...DEFAULT_FILTERS };

  it("filters by platform (any of)", () => {
    const result = filterApps(apps, { ...filters, platforms: ["macos"] });
    expect(result.map((a) => a.id).sort()).toEqual(["gimp", "keepassxc"]);
  });

  it("filters by platform (all of)", () => {
    const result = filterApps(apps, { ...filters, allPlatforms: ["windows", "linux"] });
    expect(result.map((a) => a.id).sort()).toEqual(["keepassxc", "navidrome", "spotube"]);
  });

  it("filters by category", () => {
    const result = filterApps(apps, { ...filters, categories: ["audio"] });
    expect(result.map((a) => a.id).sort()).toEqual(["navidrome", "spotube"]);
  });

  it("filters by licence", () => {
    const result = filterApps(apps, { ...filters, licenses: ["gpl-3.0"] });
    expect(result.map((a) => a.id)).toEqual(["keepassxc"]);
  });

  it("filters by minimum trust score", () => {
    const result = filterApps(apps, { ...filters, minTrust: 90 });
    expect(result.map((a) => a.id)).toEqual(["navidrome"]);
  });

  it("filters by open-source status", () => {
    const closed = app({ id: "closed", name: "Closed", open_source: false, platforms: ["windows"] });
    expect(filterApps([...apps, closed], { ...filters, openSource: true }).map((a) => a.id)).not.toContain("closed");
    expect(filterApps([...apps, closed], { ...filters, openSource: false }).map((a) => a.id)).toEqual(["closed"]);
  });

  it("filters by freshness, excluding apps without a date", () => {
    const fresh = app({ id: "fresh", name: "Fresh", updated_at: new Date().toISOString() });
    const stale = app({ id: "stale", name: "Stale", updated_at: new Date("2000-01-01").toISOString() });
    const result = filterApps([fresh, stale], { ...filters, updatedWithinDays: 30 });
    expect(result.map((a) => a.id)).toEqual(["fresh"]);
  });
});

describe("sortApps", () => {
  it("sorts by trust, popularity and name", () => {
    expect(sortApps(apps, "trust")[0].id).toBe("navidrome");
    expect(sortApps(apps, "name")[0].name).toBe("GIMP");
    expect(sortApps(apps, "popularity")[0].id).toBe("navidrome");
  });

  it("sorts by recency with missing dates last", () => {
    const dated = app({ id: "dated", name: "Dated", updated_at: "2026-01-01T00:00:00Z" });
    const undated = app({ id: "undated", name: "Undated" });
    expect(sortApps([undated, dated], "updated")[0].id).toBe("dated");
  });

  it("supports every documented sort key", () => {
    for (const key of SORT_KEYS) {
      expect(sortApps(apps, key)).toHaveLength(apps.length);
    }
  });
});

describe("pagination", () => {
  it("pages through results and clamps out-of-range pages", () => {
    const items = Array.from({ length: 25 }, (_, i) => app({ id: `a${i}`, name: `A${i}` }));
    const first = paginate(items, 1, 24);
    expect(first.items).toHaveLength(24);
    expect(first.pagination.total_pages).toBe(2);
    expect(paginate(items, 99, 24).pagination.page).toBe(2);
    expect(paginate([], 1, 24).pagination.total).toBe(0);
  });

  it("runSearch combines filters, ranking and paging", () => {
    const result = runSearch(apps, { ...DEFAULT_FILTERS, q: "music", perPage: 1 });
    expect(result.items).toHaveLength(1);
    expect(result.pagination.total).toBeGreaterThanOrEqual(2);
  });
});

describe("URL serialisation", () => {
  it("round-trips filters through the query string", () => {
    const query = filtersToQuery({
      q: "music",
      platforms: ["android"],
      categories: ["audio"],
      sort: "trust",
      page: 2,
    });
    const parsed = parseFilters(Object.fromEntries(new URLSearchParams(query).entries()));
    expect(parsed.q).toBe("music");
    expect(parsed.platforms).toEqual(["android"]);
    expect(parsed.categories).toEqual(["audio"]);
    expect(parsed.sort).toBe("trust");
    expect(parsed.page).toBe(2);
  });

  it("omits defaults so shareable URLs stay clean", () => {
    expect(filtersToQuery(DEFAULT_FILTERS)).toBe("");
  });

  it("ignores unknown sort keys and clamps per_page", () => {
    const parsed = parseFilters({ sort: "malicious", per_page: "99999" });
    expect(parsed.sort).toBe("relevance");
    expect(parsed.perPage).toBe(MAX_PER_PAGE);
  });

  it("caps the query length", () => {
    const parsed = parseFilters({ q: "x".repeat(500) });
    expect(parsed.q.length).toBe(200);
  });

  it("resets pagination when a filter changes", () => {
    const next = withFilterChange({ ...DEFAULT_FILTERS, page: 5 }, { categories: ["audio"] });
    expect(next.page).toBe(1);
    expect(next.categories).toEqual(["audio"]);
  });

  it("keeps an explicit page change", () => {
    const next = withFilterChange({ ...DEFAULT_FILTERS, page: 5 }, { page: 3 });
    expect(next.page).toBe(3);
  });
});
