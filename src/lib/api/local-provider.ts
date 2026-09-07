/**
 * Bundled OmniSource feed provider.
 *
 * Reads the versioned feed produced by `npm run ingest` (see scripts/ingest.ts),
 * validates it with the OmniSource v1 schema and answers every query in
 * process. Query logic lives in src/lib/search and is shared with the HTTP
 * provider, so both providers behave identically.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { AppSchema, FeedSchema, type App, type Category, type Collection, type Developer, type PlatformInfo, type Release } from "@/lib/schemas/omnisource";
import { CATEGORIES } from "@/config/site";
import { filterApps, runSearch, sortApps, type SearchFilters } from "@/lib/search/query";
import type {
  AppListResult,
  CatalogStats,
  CollectionResult,
  DeveloperResult,
  HomeResult,
  LatestResult,
  OmniSourceProvider,
  TrendingResult,
} from "./provider";

const FEED_PATH = path.join(process.cwd(), "data", "omnisource-feed.json");

let feedPromise: ReturnType<typeof loadFeed> | null = null;

async function loadFeed() {
  const raw = await readFile(FEED_PATH, "utf8");
  const parsed = FeedSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    // Never serve half-valid data: fail loudly so the deployment is rolled back
    // rather than silently showing a broken catalog.
    const issues = parsed.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`);
    throw new Error(`OmniSource feed is invalid (${FEED_PATH}): ${issues.join("; ")}`);
  }
  return parsed.data;
}

async function feed() {
  // Cached for the process lifetime; the file is immutable per deployment.
  if (!feedPromise) feedPromise = loadFeed();
  return feedPromise;
}

function paginate<T>(items: T[], page: number, perPage: number) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * perPage;
  return {
    items: items.slice(start, start + perPage),
    pagination: { page: safePage, per_page: perPage, total, total_pages: totalPages },
  };
}

function timeValue(iso: string | null | undefined): number {
  const t = Date.parse(iso ?? "");
  return Number.isNaN(t) ? 0 : t;
}

function first<T>(items: T[], n: number): T[] {
  return items.slice(0, n);
}

export class LocalFeedProvider implements OmniSourceProvider {
  readonly name = "omnisource-feed";
  readonly origin = FEED_PATH;

  async getFeedMeta() {
    const f = await feed();
    return {
      generated_at: f.meta.generated_at,
      generator: f.meta.generator,
      upstream: f.meta.upstream,
      app_count: f.meta.app_count,
    };
  }

  async getApps(filters: SearchFilters): Promise<AppListResult> {
    const f = await feed();
    const { items, pagination } = runSearch(f.apps, filters);
    return { items, pagination, freshness: f.meta.generated_at };
  }

  async search(filters: SearchFilters): Promise<AppListResult> {
    return this.getApps(filters);
  }

  async getApp(idOrSlug: string): Promise<App | null> {
    const f = await feed();
    return (
      f.apps.find((a) => a.id === idOrSlug) ??
      f.apps.find((a) => a.slug === idOrSlug) ??
      f.apps.find((a) => a.source.repo?.toLowerCase() === idOrSlug.toLowerCase()) ??
      null
    );
  }

  async getAppsByIds(ids: string[]): Promise<App[]> {
    const f = await feed();
    const wanted = new Set(ids);
    // Preserve the caller's ordering: comparison tables must not reshuffle.
    return f.apps.filter((a) => wanted.has(a.id) || wanted.has(a.slug));
  }

  async getCategories(): Promise<Category[]> {
    const f = await feed();
    if (f.categories.length) return f.categories;
    return CATEGORIES.map((c) => ({
      slug: c.slug,
      name: c.name,
      description: c.description,
      app_count: f.apps.filter((a) => a.categories.includes(c.slug)).length,
    }));
  }

  async getPlatforms(): Promise<PlatformInfo[]> {
    const f = await feed();
    return f.platforms;
  }

  async getCollections(): Promise<Collection[]> {
    const f = await feed();
    return f.collections;
  }

  async getCollection(slug: string): Promise<CollectionResult | null> {
    const f = await feed();
    const collection = f.collections.find((c) => c.slug === slug);
    if (!collection) return null;
    return { collection, apps: await this.resolveCollection(collection) };
  }

  private async resolveCollection(collection: Collection): Promise<App[]> {
    const f = await feed();

    // Curated ids first; unknown ids are dropped rather than rendered empty.
    const curated = collection.apps
      .map((id) => f.apps.find((a) => a.id === id || a.slug === id))
      .filter((a): a is App => Boolean(a));

    if (!collection.rule) return curated;

    const rule = collection.rule;
    let pool = f.apps;
    if (rule.platforms.length) {
      pool = pool.filter((a) => rule.platforms.every((p) => a.platforms.includes(p)));
    }
    if (rule.categories.length) {
      pool = pool.filter((a) => rule.categories.some((c) => a.categories.includes(c)));
    }
    if (rule.min_platforms != null) {
      pool = pool.filter((a) => a.platforms.length >= (rule.min_platforms ?? 0));
    }
    if (rule.licenses.length) {
      pool = pool.filter((a) => rule.licenses.includes(a.license?.id ?? ""));
    }

    const sorted = sortApps(pool, rule.sort);
    const generated = first(sorted, rule.limit);

    // Curated picks always lead, then generated entries fill the rest.
    const seen = new Set(curated.map((a) => a.id));
    return [...curated, ...generated.filter((a) => !seen.has(a.id))].slice(0, Math.max(rule.limit, curated.length));
  }

  async getTrending(): Promise<TrendingResult> {
    const f = await feed();
    const popular = sortApps(f.apps, "popularity");
    const released = sortApps(f.apps, "released");
    const fastMoving = [...f.apps]
      .filter((a) => a.signals.release_cadence_days != null && a.signals.release_cadence_days <= 120)
      .sort(
        (a, b) =>
          (a.signals.release_cadence_days ?? 999) - (b.signals.release_cadence_days ?? 999) ||
          (b.scores.popularity.value ?? 0) - (a.scores.popularity.value ?? 0),
      );

    return {
      popular: first(popular, 12),
      released: first(released, 12),
      fastMoving: first(fastMoving, 12),
      freshness: f.meta.generated_at,
    };
  }

  async getLatest(): Promise<LatestResult> {
    const f = await feed();
    const releases = f.apps
      .flatMap((app) =>
        app.releases
          .filter((r) => r.released_at)
          .map((release) => ({
            app: { id: app.id, slug: app.slug, name: app.name, icon_url: app.icon_url },
            release,
          })),
      )
      .sort((a, b) => timeValue(b.release.released_at) - timeValue(a.release.released_at));

    return {
      added: first(sortApps(f.apps, "newest"), 12),
      updated: first(sortApps(f.apps, "updated"), 12),
      releases: first(releases, 18),
      freshness: f.meta.generated_at,
    };
  }

  async getHome(): Promise<HomeResult> {
    const f = await feed();
    const byTrust = sortApps(f.apps, "trust");
    const crossPlatform = [...f.apps]
      .filter((a) => a.platforms.length >= 3)
      .sort(
        (a, b) =>
          b.platforms.length - a.platforms.length ||
          (b.scores.popularity.value ?? 0) - (a.scores.popularity.value ?? 0),
      );

    return {
      featured: first(byTrust, 8),
      popular: first(sortApps(f.apps, "popularity"), 8),
      updated: first(sortApps(f.apps, "updated"), 8),
      newest: first(sortApps(f.apps, "newest"), 8),
      crossPlatform: first(crossPlatform, 8),
      categories: await this.getCategories(),
      platforms: f.platforms,
      stats: await this.getStats(),
      freshness: f.meta.generated_at,
    };
  }

  async getDeveloper(slug: string): Promise<DeveloperResult | null> {
    const f = await feed();
    const apps = f.apps.filter((a) => a.developer?.slug === slug || a.developer?.id === slug);
    if (!apps.length || !apps[0].developer) return null;
    const developer = apps[0].developer;

    const licenses = new Map<string, string>();
    const platforms = new Set<string>();
    for (const app of apps) {
      if (app.license) licenses.set(app.license.id, app.license.name);
      app.platforms.forEach((p) => platforms.add(p));
    }

    const latestReleases = apps
      .map((app) => ({ app: { id: app.id, slug: app.slug, name: app.name }, release: app.latest_release }))
      .filter((entry): entry is { app: { id: string; slug: string; name: string }; release: Release } =>
        Boolean(entry.release),
      )
      .sort((a, b) => timeValue(b.release.released_at) - timeValue(a.release.released_at));

    return {
      developer,
      apps: sortApps(apps, "popularity"),
      platforms: [...platforms],
      licenses: [...licenses].map(([id, name]) => ({ id, name })),
      latestReleases: first(latestReleases, 10),
    };
  }

  async getDevelopers(): Promise<Array<Developer & { app_count: number }>> {
    const f = await feed();
    const byId = new Map<string, Developer & { app_count: number }>();
    for (const app of f.apps) {
      if (!app.developer) continue;
      const existing = byId.get(app.developer.id);
      if (existing) existing.app_count += 1;
      else byId.set(app.developer.id, { ...app.developer, app_count: 1 });
    }
    return [...byId.values()].sort((a, b) => b.app_count - a.app_count || a.name.localeCompare(b.name));
  }

  async getReleases(idOrSlug: string): Promise<Release[]> {
    const app = await this.getApp(idOrSlug);
    return app?.releases ?? [];
  }

  async getAlternatives(idOrSlug: string): Promise<App[]> {
    const app = await this.getApp(idOrSlug);
    if (!app) return [];
    return this.getAppsByIds(app.alternatives);
  }

  async getSimilar(idOrSlug: string): Promise<App[]> {
    const app = await this.getApp(idOrSlug);
    if (!app) return [];
    const similar = await this.getAppsByIds(app.similar);
    return similar.filter((a) => a.id !== app.id);
  }

  async getStats(): Promise<CatalogStats> {
    const f = await feed();
    const developers = new Set(f.apps.map((a) => a.developer?.id).filter(Boolean));
    const assets = f.apps.flatMap((a) => a.releases.flatMap((r) => r.assets));
    return {
      apps: f.apps.length,
      releases: f.apps.reduce((sum, a) => sum + a.releases.length, 0),
      assets: assets.length,
      developers: developers.size,
      categories: (await this.getCategories()).filter((c) => c.app_count > 0).length,
      platforms: f.platforms.filter((p) => p.app_count > 0).length,
      openSource: f.apps.filter((a) => a.open_source).length,
      validatedAssets: assets.filter((a) => a.status === "VALID").length,
    };
  }

  async getLicenses(): Promise<Array<{ id: string; name: string; count: number }>> {
    const f = await feed();
    const counts = new Map<string, { name: string; count: number }>();
    for (const app of f.apps) {
      if (!app.license) continue;
      const current = counts.get(app.license.id);
      if (current) current.count += 1;
      else counts.set(app.license.id, { name: app.license.name, count: 1 });
    }
    return [...counts.entries()]
      .map(([id, value]) => ({ id, name: value.name, count: value.count }))
      .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));
  }
}

/** Validates a single app payload — reused by tests and the HTTP provider. */
export function parseApp(value: unknown): App | null {
  const parsed = AppSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function filterAppsInMemory(apps: App[], filters: SearchFilters): App[] {
  return filterApps(apps, filters);
}

export const localFeedProvider = new LocalFeedProvider();
