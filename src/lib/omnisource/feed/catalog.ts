/**
 * Bundled feed catalog — the in-process OmniSource backing store.
 *
 * OmniStore ships a validated catalog snapshot (`data/omnisource-feed.json`,
 * produced by `npm run ingest`) so a fresh deploy serves a full store with
 * zero configuration. When `OMNISOURCE_API_URL` is set, this module is never
 * loaded — the live OmniSource deployment answers instead.
 *
 * SERVER ONLY. It is reached exclusively through a dynamic import in
 * `./client.ts`, which only ever runs in the Node.js runtime, so the catalog
 * never enters the browser or edge bundles.
 *
 * The feed is loaded once per process and indexed. Indexes are built lazily on
 * first use so the cold path stays cheap for requests that never need them.
 *
 * The catalog is pulled in with a dynamic `import()` of the JSON file rather
 * than `node:fs`: webpack understands JSON in every compilation target, whereas
 * the `node:` scheme is not handled by the client or edge builds.
 */

/** Wire DTOs, exactly as OmniSource v1 would return them. */
export interface FeedAsset {
  id: string;
  platform: string;
  architecture: string;
  package_type: string;
  version: string;
  url: string;
  size_bytes: number | null;
  sha256: string | null;
  source: string | null;
  status: string;
}

export interface FeedRelease {
  version: string;
  released_at: string | null;
  notes: string | null;
  assets: FeedAsset[];
  has_breaking_changes?: boolean | null;
}

export interface FeedApp {
  id: string;
  slug: string;
  name: string;
  short_description: string | null;
  description: string | null;
  features: string[] | null;
  developer: { id: string; slug: string; name: string; url: string | null } | null;
  categories: string[];
  tags: string[];
  platforms: string[];
  license: string | null;
  homepage: string | null;
  repository: string | null;
  documentation: string | null;
  icon: string | null;
  screenshots: string[];
  scores: {
    trust: number | null;
    quality: number | null;
    popularity: number | null;
    trust_factors: string[] | null;
    quality_factors: string[] | null;
  } | null;
  latest_release: FeedRelease | null;
  releases: FeedRelease[];
  alternatives: string[];
  similar: string[];
  source_name: string | null;
  source_status: string | null;
  updated_at: string | null;
  created_at: string | null;
  open_source: boolean | null;
  active_development: boolean | null;
  /** Ingest-only signals. Stripped by the DTO schema before they reach a client. */
  _signals?: {
    stars: number;
    forks: number;
    watchers: number | null;
    open_issues: number;
    archived: boolean;
    language: string | null;
    full_name: string;
  };
  _featured?: boolean;
}

export interface FeedCollection {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  is_public: boolean;
  item_count: number;
  created_at: string | null;
  updated_at: string | null;
  sort_order?: number;
  app_slugs: string[];
}

export interface FeedCategory {
  category_type: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  sort_order?: number;
  app_count?: number;
}

export interface FeedPlatform {
  platform_type: string;
  name: string;
  display_name: string | null;
  icon: string | null;
  app_count?: number;
}

export interface FeedDeveloper {
  developer_id: string;
  slug: string;
  name: string;
  display_name: string | null;
  email: string | null;
  app_count?: number;
}

export interface FeedStats {
  applications: number;
  repositories: number;
  releases: number;
  assets: number;
  sources: number;
  platforms: number;
  categories: number;
  developers: number;
  total_downloads: number | null;
}

export interface Feed {
  schema_version: number;
  feed_version: string;
  generated_at: string;
  source: string;
  stats: FeedStats;
  categories: FeedCategory[];
  platforms: FeedPlatform[];
  developers: FeedDeveloper[];
  collections: FeedCollection[];
  apps: FeedApp[];
}

/** Thrown when the bundled feed is missing or unreadable. */
export class FeedUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FeedUnavailableError";
  }
}

let cached: Feed | null = null;
let pending: Promise<Feed> | null = null;

/**
 * Load the feed once per process. Concurrent callers share one in-flight load,
 * and a failed load is not cached as success — the next call retries.
 */
export async function loadFeed(): Promise<Feed> {
  if (cached) return cached;
  if (!pending) {
    pending = (async () => {
      let parsed: Feed;
      try {
        const mod = (await import("../../../../data/omnisource-feed.json")) as { default: Feed };
        parsed = mod.default;
      } catch (error) {
        throw new FeedUnavailableError(
          `Cannot load the bundled OmniSource feed (data/omnisource-feed.json): ${
            error instanceof Error ? error.message : String(error)
          }. Run \`npm run ingest\` to generate it.`,
        );
      }
      if (!parsed || !Array.isArray(parsed.apps) || parsed.apps.length === 0) {
        throw new FeedUnavailableError(
          "The bundled OmniSource feed contains no apps. Run `npm run ingest` to regenerate it.",
        );
      }
      cached = parsed;
      return parsed;
    })().catch((error: unknown) => {
      // Clear the in-flight promise so a later request can retry.
      pending = null;
      throw error;
    });
  }
  return pending;
}

/** Synchronous read of an already-loaded feed. Call `loadFeed()` first. */
export function getFeed(): Feed {
  if (!cached) {
    throw new FeedUnavailableError(
      "The bundled OmniSource feed has not been loaded. Await loadFeed() before reading it.",
    );
  }
  return cached;
}

/** True once the feed is in memory. */
export function isFeedLoaded(): boolean {
  return cached !== null;
}

/** Test hook — drops the cached feed so the next load re-imports it. */
export function resetFeedCache(): void {
  cached = null;
  pending = null;
}

/* ------------------------------------------------------------------ */
/* Indexes                                                             */
/* ------------------------------------------------------------------ */

interface Indexes {
  byId: Map<string, FeedApp>;
  byCategory: Map<string, FeedApp[]>;
  byPlatform: Map<string, FeedApp[]>;
  byDeveloper: Map<string, FeedApp[]>;
  byTag: Map<string, FeedApp[]>;
  /** Pre-lowercased haystack for search, built once. */
  search: Array<{ app: FeedApp; name: string; short: string; tags: string; body: string }>;
}

let indexes: Indexes | null = null;

export function getIndexes(): Indexes {
  if (indexes) return indexes;
  const feed = getFeed();
  const byId = new Map<string, FeedApp>();
  const byCategory = new Map<string, FeedApp[]>();
  const byPlatform = new Map<string, FeedApp[]>();
  const byDeveloper = new Map<string, FeedApp[]>();
  const byTag = new Map<string, FeedApp[]>();

  const push = (map: Map<string, FeedApp[]>, key: string, app: FeedApp) => {
    const bucket = map.get(key);
    if (bucket) bucket.push(app);
    else map.set(key, [app]);
  };

  for (const app of feed.apps) {
    // Apps resolve by slug or id — OmniStore links with the slug, the API
    // contract also accepts the id, and both are stable here.
    byId.set(app.id, app);
    if (app.slug !== app.id) byId.set(app.slug, app);
    for (const category of app.categories) push(byCategory, category, app);
    for (const platform of app.platforms) push(byPlatform, platform, app);
    if (app.developer) {
      push(byDeveloper, app.developer.id, app);
      if (app.developer.slug !== app.developer.id) push(byDeveloper, app.developer.slug, app);
    }
    for (const tag of app.tags) push(byTag, tag.toLowerCase(), app);
  }

  const search = feed.apps.map((app) => ({
    app,
    name: app.name.toLowerCase(),
    short: (app.short_description ?? "").toLowerCase(),
    tags: app.tags.join(" ").toLowerCase(),
    body: `${app.name} ${app.short_description ?? ""} ${app.tags.join(" ")}`.toLowerCase(),
  }));

  indexes = { byId, byCategory, byPlatform, byDeveloper, byTag, search };
  return indexes;
}

/** Reset indexes (tests, or after a feed swap). */
export function resetIndexes(): void {
  indexes = null;
}

/** One app by id or slug. */
export function findApp(idOrSlug: string): FeedApp | null {
  return getIndexes().byId.get(decodeURIComponent(idOrSlug)) ?? null;
}

/** Every app in the catalog, in the feed's canonical order. */
export function allApps(): FeedApp[] {
  return getFeed().apps;
}
