/**
 * Bundled-feed request router — the OmniSource v1 wire contract, served
 * in-process from `data/omnisource-feed.json`.
 *
 * This is the fallback data path: it implements exactly the endpoints the
 * OmniSource SDK calls, returning the same DTO shapes a live OmniSource
 * returns, so every page and component works identically whether the catalog
 * comes from the bundled feed or a deployment. When `OMNISOURCE_API_URL` is
 * configured this module is never loaded.
 *
 * SERVER ONLY — reached through a dynamic import in `./client.ts`.
 *
 * Honesty rule: trust and security reports are derived *only* from signals the
 * ingest actually observed (licence, asset validation, release cadence,
 * repository activity). Nothing here claims a vulnerability scan, CVE audit or
 * malware analysis ran, because none did — see `securityFor()`.
 */

import {
  allApps,
  findApp,
  getFeed,
  getIndexes,
  loadFeed,
  type FeedApp,
  type FeedCollection,
} from "./catalog";

/** Mirrors OmniSourceError's shape so `client.safe()` classifies it the same. */
export class FeedRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "FeedRequestError";
  }
}

const MAX_PER_PAGE = 100;

function intParam(value: string | null, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function boolParam(value: string | null): boolean | undefined {
  if (value === null) return undefined;
  return value === "true" || value === "1";
}

/** Comma-separated filter values (platform=windows,linux) → any-of match. */
function listOf(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

/* ------------------------------------------------------------------ */
/* Filtering + sorting                                                 */
/* ------------------------------------------------------------------ */

function applyFilters(apps: FeedApp[], query: URLSearchParams): FeedApp[] {
  const platforms = listOf(query.get("platform"));
  const categories = listOf(query.get("category"));
  const architectures = listOf(query.get("architecture"));
  const licenses = listOf(query.get("license"));
  const developer = query.get("developer");
  const openSource = boolParam(query.get("open_source"));
  const minTrust = query.get("min_trust");
  const minQuality = query.get("min_quality");
  const updatedSince = query.get("updated_since");
  const sinceMs = updatedSince ? Date.parse(updatedSince) : NaN;

  return apps.filter((app) => {
    if (platforms.length > 0 && !platforms.some((p) => app.platforms.includes(p))) return false;
    if (categories.length > 0 && !categories.some((c) => app.categories.includes(c))) return false;
    if (architectures.length > 0) {
      const have = new Set(app.releases.flatMap((r) => r.assets.map((a) => a.architecture)));
      if (!architectures.some((a) => have.has(a))) return false;
    }
    if (licenses.length > 0 && !(app.license && licenses.includes(app.license))) return false;
    if (developer) {
      const d = app.developer;
      if (!d || (d.id !== developer && d.slug !== developer && d.name.toLowerCase() !== developer.toLowerCase())) {
        return false;
      }
    }
    if (openSource === true && app.open_source !== true) return false;
    if (minTrust !== null && (app.scores?.trust ?? 0) < Number(minTrust)) return false;
    if (minQuality !== null && (app.scores?.quality ?? 0) < Number(minQuality)) return false;
    if (Number.isFinite(sinceMs)) {
      const updated = app.updated_at ? Date.parse(app.updated_at) : NaN;
      if (!Number.isFinite(updated) || updated < sinceMs) return false;
    }
    return true;
  });
}

const byPopularity = (a: FeedApp, b: FeedApp) =>
  (b.scores?.popularity ?? 0) - (a.scores?.popularity ?? 0) || a.name.localeCompare(b.name);

function sortApps(apps: FeedApp[], sort: string | null): FeedApp[] {
  const out = [...apps];
  switch (sort) {
    case "name":
    case "az":
      return out.sort((a, b) => a.name.localeCompare(b.name));
    case "trust":
      return out.sort((a, b) => (b.scores?.trust ?? 0) - (a.scores?.trust ?? 0) || byPopularity(a, b));
    case "quality":
      return out.sort((a, b) => (b.scores?.quality ?? 0) - (a.scores?.quality ?? 0) || byPopularity(a, b));
    case "updated":
    case "recent":
      return out.sort((a, b) => dateMs(b.updated_at) - dateMs(a.updated_at) || byPopularity(a, b));
    case "newest":
    case "new":
      return out.sort((a, b) => dateMs(b.created_at) - dateMs(a.created_at) || byPopularity(a, b));
    case "releases":
      return out.sort(
        (a, b) =>
          dateMs(b.latest_release?.released_at) - dateMs(a.latest_release?.released_at) ||
          byPopularity(a, b),
      );
    case "downloads":
      // OmniSource v1 exposes no per-app download counts — fall back to the
      // popularity signal rather than inventing a number.
      return out.sort(byPopularity);
    case "relevance":
      // Caller has already ranked; preserve that order.
      return out;
    case "popularity":
    default:
      return out.sort(byPopularity);
  }
}

function dateMs(value: string | null | undefined): number {
  if (!value) return 0;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
}

function paginate(apps: FeedApp[], query: URLSearchParams, perPageDefault = 24) {
  const perPage = intParam(query.get("per_page"), perPageDefault, 1, MAX_PER_PAGE);
  const page = intParam(query.get("page"), 1, 1, 10_000);
  const start = (page - 1) * perPage;
  return {
    items: apps.slice(start, start + perPage),
    total: apps.length,
    page,
    freshness: getFeed().generated_at,
  };
}

/* ------------------------------------------------------------------ */
/* Search — ranking + typo tolerance                                   */
/* ------------------------------------------------------------------ */

/** Levenshtein distance, capped so long strings cannot blow up the budget. */
function editDistance(a: string, b: string, cap = 3): number {
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let last = prev[0]!;
    prev[0] = i;
    let best = i;
    for (let j = 1; j <= b.length; j += 1) {
      const tmp = prev[j]!;
      prev[j] = Math.min(
        prev[j]! + 1,
        prev[j - 1]! + 1,
        last + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      last = tmp;
      best = Math.min(best, prev[j]!);
    }
    if (best > cap) return cap + 1;
  }
  return prev[b.length]!;
}

function scoreMatch(haystack: { name: string; short: string; tags: string; body: string }, terms: string[]): number {
  let score = 0;
  for (const term of terms) {
    let termScore = 0;
    if (haystack.name === term) termScore = 1000;
    else if (haystack.name.startsWith(term)) termScore = 620;
    else if (haystack.name.includes(` ${term}`) || haystack.name.includes(`-${term}`)) termScore = 420;
    else if (haystack.name.includes(term)) termScore = 260;

    if (termScore === 0) {
      // Typo tolerance: one edit for short terms, two for longer ones.
      const words = haystack.name.split(/[^a-z0-9]+/).filter(Boolean);
      const tolerance = term.length <= 4 ? 1 : 2;
      if (words.some((w) => editDistance(w, term, tolerance) <= tolerance)) termScore = 200;
    }
    if (termScore === 0 && haystack.tags.includes(term)) termScore = 150;
    if (termScore === 0 && haystack.short.includes(term)) termScore = 110;
    if (termScore === 0 && haystack.body.includes(term)) termScore = 40;
    if (termScore === 0) return 0; // every term must match somewhere
    score += termScore;
  }
  return score;
}

function searchApps(query: URLSearchParams) {
  const raw = (query.get("q") ?? "").trim().toLowerCase();
  const { search } = getIndexes();
  if (!raw) return sortApps(applyFilters(allApps(), query), query.get("sort"));

  const terms = raw.split(/\s+/).filter(Boolean);
  const scored: Array<{ app: FeedApp; score: number }> = [];
  for (const entry of search) {
    const score = scoreMatch(entry, terms);
    if (score > 0) {
      scored.push({
        app: entry.app,
        // Relevance first, popularity only as a tiebreaker within a band.
        score: score * 1000 + (entry.app.scores?.popularity ?? 0),
      });
    }
  }
  const filtered = applyFilters(
    scored.map((s) => s.app),
    query,
  );
  const allowed = new Set(filtered.map((a) => a.id));
  const ranked = scored
    .filter((s) => allowed.has(s.app.id))
    .sort((a, b) => b.score - a.score)
    .map((s) => s.app);

  const sort = query.get("sort");
  // Any explicit sort other than relevance overrides the engine ranking.
  return sort && sort !== "relevance" ? sortApps(ranked, sort) : ranked;
}

/* ------------------------------------------------------------------ */
/* Trust + security — derived from observed signals only               */
/* ------------------------------------------------------------------ */

function trustFor(app: FeedApp) {
  const score = app.scores?.trust ?? 0;
  const signals = app._signals;
  const pushedDays = app.updated_at ? (Date.now() - dateMs(app.updated_at)) / 86_400_000 : 9999;
  const assetCount = app.releases.reduce((n, r) => n + r.assets.length, 0);
  const releaseWindow = Date.now() - 548 * 86_400_000;
  const recentReleases = app.releases.filter((r) => dateMs(r.released_at) > releaseWindow).length;

  const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
  const factors: Record<string, number> = {
    oss_license: app.open_source === true ? 1 : 0,
    active_repository: app.active_development === true && !signals?.archived ? 1 : 0,
    validated_assets: Number(clamp01(assetCount / 8).toFixed(2)),
    recent_releases: Number(clamp01(recentReleases / 6).toFixed(2)),
    recent_activity: Number(clamp01(1 - pushedDays / 365).toFixed(2)),
    established_contributors: Number(
      clamp01(Math.log10(Math.max(1, signals?.forks ?? 0)) / 3.5).toFixed(2),
    ),
  };

  const badges: string[] = [];
  if (app.open_source === true) badges.push("verified");
  if (score >= 85) badges.push("trusted");
  if (score >= 70) badges.push("community_verified");
  if (signals?.archived) badges.push("deprecated");
  if (assetCount === 0) badges.push("experimental");

  return {
    app_id: app.id,
    score,
    factors,
    badges: [...new Set(badges)],
    calculated_at: getFeed().generated_at,
  };
}

/**
 * Security report from the bundled feed.
 *
 * Every scan listed here is a check `npm run ingest` really performed against
 * upstream metadata. There is deliberately NO vulnerability scan, CVE lookup or
 * malware analysis in this data path, so none is reported — an honest "we did
 * not run that" is worth more than a fabricated pass. Scan names state exactly
 * what was checked.
 */
function securityFor(app: FeedApp) {
  const assets = app.releases.flatMap((r) => r.assets);
  const generatedAt = getFeed().generated_at;
  const scannerVersion = `ingest-${getFeed().feed_version}`;

  const httpsOnly = assets.length > 0 && assets.every((a) => a.url.startsWith("https://"));
  const sizedAssets = assets.filter((a) => (a.size_bytes ?? 0) > 0).length;
  const hasLicence = Boolean(app.license);
  const active = app.active_development === true;
  const archived = app._signals?.archived === true;

  const metadataPassed = httpsOnly && app.repository !== null;
  const assetsPassed = assets.length > 0 && sizedAssets === assets.length;
  const licencePassed = hasLicence && app.open_source === true;
  const activityPassed = active && !archived;

  const results = [metadataPassed, assetsPassed, licencePassed, activityPassed];
  const passed = results.filter(Boolean).length;
  const securityScore = Math.round((passed / results.length) * 100);

  const scan = (
    type: string,
    ok: boolean,
    detail: string,
    confidence: number,
  ) => ({
    type,
    status: ok ? "passed" : "warning",
    severity: ok ? null : "low",
    confidence,
    findings: ok ? [] : [detail],
    // Never populated from the feed: no vulnerability scanning runs here.
    vulnerabilities: [],
    scanned_at: generatedAt,
    scanner_version: scannerVersion,
  });

  return {
    app_id: app.id,
    security_score: securityScore,
    risk_score: 100 - securityScore,
    status: securityScore >= 75 ? "passed" : securityScore >= 50 ? "warning" : "review_required",
    latest_scanned_at: generatedAt,
    scans: [
      scan(
        "metadata_integrity",
        metadataPassed,
        "Repository metadata or download URLs could not be fully verified over HTTPS.",
        0.98,
      ),
      scan(
        "release_asset_validation",
        assetsPassed,
        assets.length === 0
          ? "No installer assets are published for this project."
          : "Some release assets report no size, so their integrity could not be confirmed.",
        0.95,
      ),
      scan(
        "license_provenance",
        licencePassed,
        "No OSI-recognised licence was declared on the upstream repository.",
        0.99,
      ),
      scan(
        "repository_activity",
        activityPassed,
        archived
          ? "The upstream repository is archived and will not receive security fixes."
          : "No commits in the last 12 months — patches may be slow to arrive.",
        0.9,
      ),
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Recommendations                                                     */
/* ------------------------------------------------------------------ */

function recommendationResponse(
  subjectId: string | null,
  items: Array<{ app: FeedApp; kind: string; reasons: string[] }>,
  limit: number,
) {
  const seen = new Set<string>();
  const chosen = items.filter((item) => {
    if (item.app.id === subjectId || seen.has(item.app.id)) return false;
    seen.add(item.app.id);
    return true;
  });
  return {
    subject_app_id: subjectId,
    algorithm_version: "feed-v1",
    generated_at: getFeed().generated_at,
    items: chosen.slice(0, limit).map((item, index) => ({
      app: item.app,
      // Deterministic decay so ordering is stable and explainable.
      score: Number(Math.max(0.05, 0.95 - index * 0.06).toFixed(3)),
      kind: item.kind,
      reasons: item.reasons,
    })),
  };
}

function relatedFor(app: FeedApp, limit: number) {
  const graph = [...app.similar, ...app.alternatives];
  const seen = new Set<string>();
  const items: Array<{ app: FeedApp; kind: string; reasons: string[] }> = [];
  for (const slug of graph) {
    const target = findApp(slug);
    if (!target || seen.has(target.id)) continue;
    seen.add(target.id);
    const sharedTags = target.tags.filter((tag) => app.tags.includes(tag)).slice(0, 3);
    const reasons = [
      ...(app.categories.some((c) => target.categories.includes(c))
        ? [`Same category: ${target.categories[0]}`]
        : []),
      ...(sharedTags.length > 0 ? [`Shares ${sharedTags.join(", ")}`] : []),
    ];
    items.push({
      app: target,
      kind: app.similar.includes(slug) ? "similar" : "alternative",
      reasons: reasons.length > 0 ? reasons : [`Popular in ${target.categories[0] ?? "open source"}`],
    });
  }
  return recommendationResponse(app.id, items, limit);
}

/* ------------------------------------------------------------------ */
/* Collections                                                         */
/* ------------------------------------------------------------------ */

function collectionSummary(collection: { id: string; slug: string; name: string; description: string | null; is_public: boolean; item_count: number; created_at: string | null; updated_at: string | null }) {
  return {
    id: collection.id,
    slug: collection.slug,
    name: collection.name,
    description: collection.description,
    is_public: collection.is_public,
    item_count: collection.item_count,
    created_at: collection.created_at,
    updated_at: collection.updated_at,
  };
}

function collectionDetail(collection: FeedCollection) {
  const apps = collection.app_slugs.map((slug) => findApp(slug)).filter((a): a is FeedApp => a !== null);
  return { ...collectionSummary(collection), items: apps };
}

/* ------------------------------------------------------------------ */
/* Router                                                              */
/* ------------------------------------------------------------------ */

/**
 * Serve one OmniSource v1 request from the bundled feed.
 * Throws `FeedRequestError` for unknown routes and unknown resources so the
 * caller maps them onto the same error envelope a live upstream would send.
 */
export async function serveFeedRequest(rawPath: string): Promise<unknown> {
  await loadFeed();
  const url = new URL(rawPath, "feed://bundled");
  const pathname = url.pathname.replace(/\/+$/, "") || "/";
  const query = url.searchParams;
  const feed = getFeed();
  const segments = pathname.split("/").filter(Boolean);

  /* ---- catalog stats ---- */
  if (pathname === "/stats") {
    return {
      applications: feed.apps.length,
      total_apps: feed.apps.length,
      repositories: feed.stats.repositories,
      releases: feed.apps.reduce((n, a) => n + a.releases.length, 0),
      assets: feed.apps.reduce((n, a) => n + a.releases.reduce((m, r) => m + r.assets.length, 0), 0),
      sources: feed.stats.sources,
      platforms: feed.platforms.length,
      categories: feed.categories.length,
      total_downloads: feed.stats.total_downloads ?? null,
    };
  }

  /* ---- app listing / search ---- */
  if (pathname === "/apps" || pathname === "/search") {
    const ranked = pathname === "/search" ? searchApps(query) : sortApps(applyFilters(allApps(), query), query.get("sort"));
    const q = pathname === "/apps" ? query.get("q") : null;
    const items = q ? searchApps(query) : ranked;
    return paginate(items, query);
  }

  if (segments[0] === "apps" && segments.length === 2) {
    const app = findApp(segments[1]!);
    if (!app) throw new FeedRequestError(404, "not_found", `No app for '${segments[1]}' in the bundled feed`);
    return app;
  }

  /* ---- trending / latest ---- */
  if (pathname === "/trending") {
    const limit = intParam(query.get("limit"), 12, 1, MAX_PER_PAGE);
    return sortApps(allApps(), "popularity").slice(0, limit);
  }
  if (pathname === "/latest") {
    const limit = intParam(query.get("limit"), 12, 1, MAX_PER_PAGE);
    return sortApps(allApps(), "releases").slice(0, limit);
  }

  /* ---- taxonomy ---- */
  if (pathname === "/categories") {
    return [...feed.categories].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }
  if (segments[0] === "categories" && segments.length === 2) {
    const slug = decodeURIComponent(segments[1]!);
    const category = feed.categories.find((c) => c.slug === slug || c.category_type === slug);
    if (!category) throw new FeedRequestError(404, "not_found", `No category '${slug}'`);
    return {
      ...category,
      app_count: getIndexes().byCategory.get(slug)?.length ?? 0,
    };
  }
  if (pathname === "/platforms") {
    return [...feed.platforms].map((platform) => ({
      ...platform,
      app_count: getIndexes().byPlatform.get(platform.platform_type)?.length ?? 0,
    }));
  }

  /* ---- developers ---- */
  if (pathname === "/developers") {
    const limit = intParam(query.get("limit"), 60, 1, 1000);
    return [...feed.developers].slice(0, limit);
  }
  if (segments[0] === "developers" && segments.length === 2) {
    const id = decodeURIComponent(segments[1]!);
    const developer = feed.developers.find(
      (d) => d.developer_id === id || d.slug === id || d.name.toLowerCase() === id.toLowerCase(),
    );
    if (!developer) throw new FeedRequestError(404, "not_found", `No developer '${id}'`);
    return { ...developer, app_count: developer.app_count ?? 0 };
  }

  /* ---- collections ---- */
  if (pathname === "/collections") {
    const perPage = intParam(query.get("per_page"), 30, 1, MAX_PER_PAGE);
    const page = intParam(query.get("page"), 1, 1, 1000);
    const ordered = [...feed.collections].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    // The index intentionally omits `items`: the detail route attaches apps.
    return {
      items: ordered.slice((page - 1) * perPage, page * perPage).map(collectionSummary),
      total: ordered.length,
      page,
      per_page: perPage,
    };
  }
  if (segments[0] === "collections" && segments.length === 2) {
    const key = decodeURIComponent(segments[1]!);
    const collection = feed.collections.find((c) => c.id === key || c.slug === key);
    if (!collection) throw new FeedRequestError(404, "not_found", `No collection '${key}'`);
    return collectionDetail(collection);
  }

  /* ---- recommendations ---- */
  if (pathname === "/recommendations" || pathname === "/recommendations/similar") {
    const id = query.get("app_id") ?? query.get("appId") ?? "";
    const limit = intParam(query.get("limit"), 8, 1, 60);
    const app = findApp(id);
    if (!app) throw new FeedRequestError(404, "not_found", `No app for '${id}'`);
    return relatedFor(app, limit);
  }
  if (pathname === "/recommendations/trending") {
    const limit = intParam(query.get("limit"), 12, 1, MAX_PER_PAGE);
    const items = sortApps(allApps(), "popularity")
      .slice(0, limit)
      .map((app) => ({
        app,
        kind: "trending",
        reasons: [
          `${(app._signals?.stars ?? 0).toLocaleString("en-US")} stars upstream`,
          `Popular in ${app.categories[0] ?? "open source"}`,
        ],
      }));
    return recommendationResponse(null, items, limit);
  }
  if (pathname === "/recommendations/discover") {
    const limit = intParam(query.get("limit"), 12, 1, MAX_PER_PAGE);
    // "New" means new *versions* — the homepage row is "New releases, the
    // latest versions hot from upstream". Sorting by repository creation date
    // instead surfaced projects that have never published a release at all.
    const isNew = query.get("sort") !== "popular";
    const sort = isNew ? "releases" : "popularity";
    const category = query.get("category");
    // Rows about new releases must only contain projects that have releases.
    const poolBase = category ? (getIndexes().byCategory.get(category) ?? []) : allApps();
    const pool = isNew ? poolBase.filter((app) => app.latest_release !== null) : poolBase;
    const items = sortApps(pool, sort)
      .slice(0, limit)
      .map((app) => ({
        app,
        kind: isNew ? "new" : "popular",
        reasons: [
          isNew
            ? `Version ${app.latest_release?.version} released upstream`
            : `${(app._signals?.stars ?? 0).toLocaleString("en-US")} stars upstream`,
          `In ${app.categories[0] ?? "open source"}`,
        ],
      }));
    return recommendationResponse(null, items, limit);
  }

  /* ---- trust + security ---- */
  if (segments[0] === "trust" && segments.length === 2) {
    const app = findApp(segments[1]!);
    if (!app) throw new FeedRequestError(404, "not_found", `No app for '${segments[1]}'`);
    return trustFor(app);
  }
  if (segments[0] === "security" && segments.length === 2) {
    const app = findApp(segments[1]!);
    if (!app) throw new FeedRequestError(404, "not_found", `No app for '${segments[1]}'`);
    return securityFor(app);
  }

  /* ---- opt-in analytics: accepted and discarded, never persisted here ---- */
  if (pathname === "/analytics/events") return { accepted: 1 };

  throw new FeedRequestError(404, "not_found", `Bundled feed has no route '${pathname}'`);
}
