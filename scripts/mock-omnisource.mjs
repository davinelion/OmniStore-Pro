#!/usr/bin/env node
/**
 * Mock OmniSource API v1 server for local/E2E use.
 *
 * Serves a small, deterministic catalog that satisfies the same zod
 * contracts the real OmniSource backend enforces (packages/shared-models).
 * No network calls, no state — fully hermetic for Playwright runs.
 *
 * Usage: node scripts/mock-omnisource.mjs [--port 8007]
 */

import { createServer } from "node:http";

const PORT = Number(
  process.argv.includes("--port")
    ? process.argv[process.argv.indexOf("--port") + 1]
    : process.env.MOCK_PORT ?? 8007,
);

const NOW = "2026-09-10T12:00:00Z";

/* ------------------------------------------------------------------ */
/* Fixtures                                                            */
/* ------------------------------------------------------------------ */

const DEVELOPERS = {
  "localsend-org": {
    developer_id: "localsend-org",
    slug: "localsend-org",
    name: "LocalSend Team",
    display_name: "LocalSend Team",
    email: null,
    url: null,
  },
  joplin: {
    developer_id: "joplin",
    slug: "joplin",
    name: "Joplin",
    display_name: "Joplin",
    email: null,
    url: null,
  },
  "keepassxc-org": {
    developer_id: "keepassxc-org",
    slug: "keepassxc-org",
    name: "KeePassXC Team",
    display_name: "KeePassXC Team",
    email: null,
    url: null,
  },
  rustdesk: {
    developer_id: "rustdesk",
    slug: "rustdesk",
    name: "RustDesk",
    display_name: "RustDesk",
    email: null,
    url: null,
  },
};

function app(slug, name, summary, description, category, platforms, developerId, scores, license, repo) {
  const developer = DEVELOPERS[developerId];
  return {
    id: slug,
    slug,
    name,
    short_description: summary,
    description,
    features: ["Cross-platform", "Open source"],
    developer: { id: developerId, slug: developer.slug, name: developer.name, url: `https://github.com/${developerId}` },
    categories: [category],
    tags: [category, "open-source"],
    platforms,
    license,
    homepage: `https://${slug}.example.org`,
    repository: repo,
    documentation: `https://${slug}.example.org/docs`,
    icon: null,
    screenshots: [],
    scores: { trust: scores[0], quality: scores[1], popularity: scores[2], trust_factors: ["open_source_license"] },
    latest_release: {
      version: "2.1.0",
      released_at: "2026-09-01T10:00:00Z",
      notes: "Stable release with sync improvements and bug fixes.",
      has_breaking_changes: false,
      assets: [
        {
          id: `${slug}-apk`,
          platform: platforms.includes("android") ? "android" : platforms[0],
          architecture: "arm64",
          package_type: "apk",
          version: "2.1.0",
          url: `${repo}/releases/download/v2.1.0/${slug}-2.1.0-arm64.apk`,
          size_bytes: 24_500_000,
          sha256: "a".repeat(64),
          source: "github_release",
          status: "VALID",
        },
        {
          id: `${slug}-x64`,
          platform: platforms[platforms.length - 1],
          architecture: "x86_64",
          package_type: "appimage",
          version: "2.1.0",
          url: `${repo}/releases/download/v2.1.0/${slug}-2.1.0-x86_64.AppImage`,
          size_bytes: 98_000_000,
          sha256: "b".repeat(64),
          source: "github_release",
          status: "VALID",
        },
      ],
    },
    releases: [
      {
        version: "2.1.0",
        released_at: "2026-09-01T10:00:00Z",
        notes: "Stable release with sync improvements and bug fixes.",
        assets: [],
      },
      {
        version: "2.0.0",
        released_at: "2026-06-12T10:00:00Z",
        notes: "Major release: new protocol, faster transfers.",
        assets: [],
      },
      {
        version: "1.9.5",
        released_at: "2026-03-02T10:00:00Z",
        notes: "Maintenance release.",
        assets: [],
      },
    ],
    alternatives: [],
    similar: [],
    source_name: "GitHub",
    source_status: "HEALTHY",
    updated_at: "2026-09-01T10:00:00Z",
    created_at: "2023-01-15T10:00:00Z",
    open_source: true,
    active_development: true,
  };
}

const APPS = [
  app(
    "localsend",
    "LocalSend",
    "Share files to nearby devices",
    "LocalSend is a free, open-source cross-platform app to share files and messages with nearby devices over the local network — an alternative to AirDrop.",
    "utilities",
    ["android", "windows", "macos", "linux"],
    "localsend-org",
    [94, 90, 88],
    "Apache-2.0",
    "https://github.com/mock/localsend",
  ),
  app(
    "joplin",
    "Joplin",
    "Notes and to-do lists with sync",
    "Joplin is a privacy-focused note taking and to-do application with markdown support and end-to-end encrypted sync.",
    "productivity",
    ["android", "windows", "macos", "linux"],
    "joplin",
    [91, 89, 84],
    "AGPL-3.0",
    "https://github.com/mock/joplin",
  ),
  app(
    "keepassxc",
    "KeePassXC",
    "Cross-platform password manager",
    "KeePassXC is a modern, secure, and open-source password manager that stores and manages your most sensitive information locally.",
    "security",
    ["windows", "macos", "linux"],
    "keepassxc-org",
    [96, 92, 80],
    "GPL-3.0",
    "https://github.com/mock/keepassxc",
  ),
  app(
    "rustdesk",
    "RustDesk",
    "Open-source remote desktop",
    "RustDesk is an open-source remote desktop application designed for self-hosting, as an alternative to TeamViewer.",
    "utilities",
    ["android", "windows", "macos", "linux"],
    "rustdesk",
    [88, 85, 86],
    "AGPL-3.0",
    "https://github.com/mock/rustdesk",
  ),
];

// Relationship graph for the recommendation engine responses.
APPS[0].similar = ["rustdesk", "joplin"];
APPS[0].alternatives = ["rustdesk"];
APPS[1].similar = ["localsend"];
APPS[2].similar = ["keepassxc"];
APPS[3].similar = ["localsend"];
APPS[3].alternatives = ["localsend"];

const COLLECTIONS = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    slug: "featured",
    name: "Featured",
    description: "Hand-picked essentials the editors highlight this week.",
    appSlugs: ["localsend", "keepassxc", "joplin"],
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    slug: "privacy-first",
    name: "Privacy First",
    description: "Apps that respect your data and never phone home.",
    appSlugs: ["keepassxc", "rustdesk"],
  },
];

const CATEGORIES = [
  { category_type: "utilities", slug: "utilities", name: "Utilities", description: "Everyday tools and helpers.", icon: "wrench", sort_order: 1 },
  { category_type: "productivity", slug: "productivity", name: "Productivity", description: "Notes, tasks and office apps.", icon: "check", sort_order: 2 },
  { category_type: "security", slug: "security", name: "Security", description: "Password managers and privacy tools.", icon: "shield", sort_order: 3 },
];

const PLATFORMS = [
  { platform_type: "android", name: "Android", display_name: "Android", icon: "android" },
  { platform_type: "windows", name: "Windows", display_name: "Windows", icon: "windows" },
  { platform_type: "macos", name: "macOS", display_name: "macOS", icon: "macos" },
  { platform_type: "linux", name: "Linux", display_name: "Linux", icon: "linux" },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function bySlug(slug) {
  return APPS.find((a) => a.slug === slug || a.id === slug) ?? null;
}

function withItems(collection) {
  return {
    id: collection.id,
    slug: collection.slug,
    name: collection.name,
    description: collection.description,
    is_public: true,
    item_count: collection.appSlugs.length,
    created_at: NOW,
    updated_at: NOW,
    items: collection.appSlugs.map((slug) => bySlug(slug)).filter(Boolean),
  };
}

function collectionSummary(collection) {
  const { appSlugs, ...rest } = collection;
  return { ...rest, is_public: true, item_count: appSlugs.length, created_at: NOW, updated_at: NOW };
}

function paginate(items, query) {
  const page = Math.max(1, Number.parseInt(query.get("page") ?? "1", 10) || 1);
  const perPage = Math.min(100, Number.parseInt(query.get("per_page") ?? "30", 10) || 30);
  return {
    items: items.slice((page - 1) * perPage, page * perPage),
    total: items.length,
    page,
    freshness: NOW,
  };
}

function matchesQuery(entry, q) {
  if (!q) return true;
  const needle = q.toLowerCase();
  return (
    entry.name.toLowerCase().includes(needle) ||
    (entry.short_description ?? "").toLowerCase().includes(needle) ||
    entry.tags.some((tag) => tag.includes(needle))
  );
}

function recommendationItem(targetApp, score, kind, reasons) {
  return { app: targetApp, score, kind, reasons };
}

function recommendationsFor(slug, kind, limit) {
  const subject = bySlug(slug);
  const graph = kind === "similar" ? (subject?.similar ?? []) : [...(subject?.similar ?? []), ...(subject?.alternatives ?? [])];
  const seen = new Set();
  const related = graph
    .map((targetSlug) => bySlug(targetSlug))
    .filter((target) => {
      if (!target || seen.has(target.id)) return false;
      seen.add(target.id);
      return true;
    });
  // Top up with the rest of the catalog so the row never renders empty.
  for (const candidate of APPS) {
    if (related.length >= Math.max(3, limit ?? 8)) break;
    if (!seen.has(candidate.id) && candidate.id !== subject?.id) {
      seen.add(candidate.id);
      related.push(candidate);
    }
  }
  return {
    subject_app_id: subject?.id ?? null,
    algorithm_version: "v1",
    generated_at: NOW,
    items: related.slice(0, limit ?? 8).map((target, index) =>
      recommendationItem(
        target,
        Math.max(0.4, 0.95 - index * 0.1),
        kind === "similar" ? "similar" : index < (subject?.similar.length ?? 0) ? "similar" : "alternative",
        [`Popular in ${target.categories[0]}`, "Similar tag profile"],
      ),
    ),
  };
}

function trustFor(slug) {
  const subject = bySlug(slug);
  if (!subject) return null;
  return {
    app_id: subject.id,
    score: subject.scores.trust,
    factors: {
      open_source_license: 1,
      validated_assets: 0.95,
      recent_releases: 0.9,
      active_repository: 0.85,
      established_contributors: 0.8,
    },
    badges: subject.scores.trust >= 90 ? ["verified", "trusted", "community_verified"] : ["verified", "community_verified"],
    calculated_at: NOW,
  };
}

function securityFor(slug) {
  const subject = bySlug(slug);
  if (!subject) return null;
  const score = Math.min(100, (subject.scores.trust ?? 80) + 2);
  return {
    app_id: subject.id,
    security_score: score,
    risk_score: Math.max(0, 100 - score),
    status: "passed",
    latest_scanned_at: NOW,
    scans: [
      {
        type: "metadata_integrity",
        status: "passed",
        severity: null,
        confidence: 0.97,
        findings: [],
        vulnerabilities: [],
        scanned_at: NOW,
        scanner_version: "1.0.0",
      },
      {
        type: "vulnerability_scan",
        status: "passed",
        severity: null,
        confidence: 0.95,
        findings: [],
        vulnerabilities: [],
        scanned_at: NOW,
        scanner_version: "1.0.0",
      },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Server                                                              */
/* ------------------------------------------------------------------ */

const server = createServer((request, response) => {
  const url = new URL(request.url, `http://127.0.0.1:${PORT}`);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const query = url.searchParams;
  const send = (status, body, type = "application/json") => {
    const payload = typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body);
    response.writeHead(status, { "content-type": type });
    response.end(payload);
  };

  try {
    // Health (both the SDK's /../health and the plain path)
    if (path === "/health" || path === "/api/v1/health") {
      return send(200, { status: "ok", timestamp: NOW });
    }

    if (path === "/api/v1/stats") {
      const releases = APPS.reduce((sum, entry) => sum + entry.releases.length + 1, 0);
      const assets = APPS.reduce((sum, entry) => sum + entry.latest_release.assets.length, 0);
      return send(200, {
        applications: APPS.length,
        total_apps: APPS.length,
        repositories: APPS.length,
        releases,
        assets,
        sources: 1,
        platforms: PLATFORMS.length,
        categories: CATEGORIES.length,
        total_downloads: null,
      });
    }

    if (path === "/api/v1/apps" || path === "/api/v1/search") {
      let items = [...APPS];
      const q = query.get("q");
      if (path === "/api/v1/search") items = items.filter((entry) => matchesQuery(entry, q));
      else if (q) items = items.filter((entry) => matchesQuery(entry, q));
      const category = query.get("category");
      if (category) items = items.filter((entry) => entry.categories.includes(category));
      const platform = query.get("platform");
      if (platform) items = items.filter((entry) => entry.platforms.includes(platform));
      const developer = query.get("developer");
      if (developer) items = items.filter((entry) => entry.developer?.slug === developer || entry.developer?.id === developer);
      const minTrust = Number.parseInt(query.get("min_trust") ?? "", 10);
      if (Number.isFinite(minTrust)) items = items.filter((entry) => (entry.scores?.trust ?? 0) >= minTrust);

      const sort = query.get("sort") ?? (path === "/api/v1/search" ? "relevance" : "popularity");
      if (sort === "name") items.sort((a, b) => a.name.localeCompare(b.name));
      else if (sort === "updated") items.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
      else if (sort === "newest") items.sort((a, b) => b.created_at.localeCompare(a.created_at));
      else if (sort === "trust") items.sort((a, b) => (b.scores?.trust ?? 0) - (a.scores?.trust ?? 0));
      else if (sort === "popularity") items.sort((a, b) => (b.scores?.popularity ?? 0) - (a.scores?.popularity ?? 0));

      return send(200, paginate(items, query));
    }

    if (path.startsWith("/api/v1/apps/")) {
      const slug = decodeURIComponent(path.split("/")[4] ?? "");
      const subject = bySlug(slug);
      return subject ? send(200, subject) : send(404, { detail: "Not Found" });
    }

    if (path === "/api/v1/trending") return send(200, [...APPS].sort((a, b) => (b.scores.popularity ?? 0) - (a.scores.popularity ?? 0)));
    if (path === "/api/v1/latest") {
      return send(200, [...APPS].sort((a, b) => b.updated_at.localeCompare(a.updated_at)));
    }

    if (path === "/api/v1/categories") return send(200, CATEGORIES);
    if (path.startsWith("/api/v1/categories/")) {
      const slug = decodeURIComponent(path.split("/")[4] ?? "");
      const category = CATEGORIES.find((entry) => entry.slug === slug);
      if (!category) return send(404, { detail: "Not Found" });
      return send(200, {
        ...category,
        app_count: APPS.filter((entry) => entry.categories.includes(slug)).length,
      });
    }

    if (path === "/api/v1/platforms") return send(200, PLATFORMS);

    if (path === "/api/v1/developers") {
      const list = Object.values(DEVELOPERS).map((developer) => ({
        ...developer,
        app_count: APPS.filter((entry) => entry.developer?.slug === developer.slug).length,
      }));
      return send(200, list);
    }
    if (path.startsWith("/api/v1/developers/")) {
      const slug = decodeURIComponent(path.split("/")[4] ?? "");
      const developer = DEVELOPERS[slug];
      if (!developer) return send(404, { detail: "Not Found" });
      return send(200, {
        ...developer,
        app_count: APPS.filter((entry) => entry.developer?.slug === slug).length,
      });
    }

    if (path === "/api/v1/collections") {
      const items = COLLECTIONS.map(collectionSummary);
      return send(200, { items, total: items.length, page: 1, per_page: Number.parseInt(query.get("per_page") ?? "30", 10) || 30 });
    }
    if (path.startsWith("/api/v1/collections/")) {
      const key = decodeURIComponent(path.split("/")[4] ?? "");
      const collection = COLLECTIONS.find((entry) => entry.id === key || entry.slug === key);
      return collection ? send(200, withItems(collection)) : send(404, { detail: "Not Found" });
    }

    if (path === "/api/v1/recommendations") {
      const slug = query.get("app_id") ?? query.get("slug") ?? "";
      if (!bySlug(slug)) return send(404, { detail: "Not Found" });
      return send(200, recommendationsFor(slug, "all", Number.parseInt(query.get("limit") ?? "12", 10) || 12));
    }
    if (path === "/api/v1/recommendations/similar") {
      const slug = query.get("app_id") ?? "";
      if (!bySlug(slug)) return send(404, { detail: "Not Found" });
      return send(200, recommendationsFor(slug, "similar", Number.parseInt(query.get("limit") ?? "8", 10) || 8));
    }
    if (path === "/api/v1/recommendations/trending") {
      const limit = Number.parseInt(query.get("limit") ?? "8", 10) || 8;
      return send(200, {
        subject_app_id: null,
        algorithm_version: "v1",
        generated_at: NOW,
        items: [...APPS]
          .sort((a, b) => (b.scores.popularity ?? 0) - (a.scores.popularity ?? 0))
          .slice(0, limit)
          .map((entry, index) => recommendationItem(entry, 0.9 - index * 0.05, "trending", ["Trending this week"])),
      });
    }
    if (path === "/api/v1/recommendations/discover") {
      const limit = Number.parseInt(query.get("limit") ?? "12", 10) || 12;
      const category = query.get("category");
      let items = APPS.filter((entry) => !category || entry.categories.includes(category));
      const sort = query.get("sort") ?? "new";
      items = [...items].sort((a, b) =>
        sort === "popular" ? (b.scores.popularity ?? 0) - (a.scores.popularity ?? 0) : b.updated_at.localeCompare(a.updated_at),
      );
      return send(200, {
        subject_app_id: null,
        algorithm_version: "v1",
        generated_at: NOW,
        items: items.slice(0, limit).map((entry, index) =>
          recommendationItem(entry, 0.9 - index * 0.05, sort === "popular" ? "popular" : "new", ["Recently updated"]),
        ),
      });
    }

    if (path.startsWith("/api/v1/trust/")) {
      const report = trustFor(decodeURIComponent(path.split("/")[4] ?? ""));
      return report ? send(200, report) : send(404, { detail: "Not Found" });
    }
    if (path.startsWith("/api/v1/security/")) {
      const report = securityFor(decodeURIComponent(path.split("/")[4] ?? ""));
      return report ? send(200, report) : send(404, { detail: "Not Found" });
    }

    return send(404, { detail: "Not Found" });
  } catch (error) {
    return send(500, { detail: "mock error", message: String(error) });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[mock-omnisource] listening on http://127.0.0.1:${PORT}/api/v1`);
});
