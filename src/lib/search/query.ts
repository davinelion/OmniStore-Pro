/**
 * Universal search: ranking + filtering.
 *
 * Pure, dependency-free and shared by the server (SSR pages), the BFF
 * (`/api/v1/search`) and the browser. Ranking runs over normalised OmniSource
 * data only — no UI component re-implements any of this.
 */

import type { App, Architecture, PackageType, Platform } from "@/lib/schemas/omnisource";

/* ------------------------------------------------------------------ */
/* Filters & sorting                                                   */
/* ------------------------------------------------------------------ */

export const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "popularity", label: "Popularity" },
  { value: "updated", label: "Recently Updated" },
  { value: "released", label: "Recently Released" },
  { value: "newest", label: "Newest" },
  { value: "name", label: "Name" },
  { value: "trust", label: "Trust Score" },
  { value: "quality", label: "Quality Score" },
] as const;

export type SortKey = (typeof SORT_OPTIONS)[number]["value"];
export const SORT_KEYS = SORT_OPTIONS.map((o) => o.value) as readonly SortKey[];

/** "Updated within" buckets offered in the filter UI. */
export const UPDATED_WINDOWS = [
  { value: 7, label: "Past week" },
  { value: 30, label: "Past month" },
  { value: 90, label: "Past 3 months" },
  { value: 365, label: "Past year" },
] as const;

export type SearchFilters = {
  q: string;
  platforms: Platform[];
  allPlatforms: Platform[];
  categories: string[];
  licenses: string[];
  architectures: Architecture[];
  packageTypes: PackageType[];
  openSource: boolean | null;
  minTrust: number | null;
  minQuality: number | null;
  updatedWithinDays: number | null;
  sort: SortKey;
  page: number;
  perPage: number;
};

export const DEFAULT_FILTERS: SearchFilters = {
  q: "",
  platforms: [],
  allPlatforms: [],
  categories: [],
  licenses: [],
  architectures: [],
  packageTypes: [],
  openSource: null,
  minTrust: null,
  minQuality: null,
  updatedWithinDays: null,
  sort: "relevance",
  page: 1,
  perPage: 24,
};

export const MAX_PER_PAGE = 96;
export const DEFAULT_PER_PAGE = 24;

/* ------------------------------------------------------------------ */
/* URL <-> filters (shareable searches)                                */
/* ------------------------------------------------------------------ */

export type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function list(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value.join(",") : value ?? "";
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function intOrNull(value: string | string[] | undefined, min: number, max: number): number | null {
  const n = Number.parseInt(first(value), 10);
  if (Number.isNaN(n)) return null;
  return Math.min(max, Math.max(min, n));
}

/**
 * Accepts the short canonical query keys (`platform`, `category`, …) and their
 * long forms (`platforms`, `categories`, …) so external clients can use
 * whichever reads better. Unknown keys are ignored.
 */
function pick(params: RawSearchParams, ...keys: string[]): string | string[] | undefined {
  for (const key of keys) {
    const value = params[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

export function parseFilters(params: RawSearchParams): SearchFilters {
  const sort = first(params.sort) as SortKey;
  const oss = first(pick(params, "oss", "open_source"));
  const perPage = intOrNull(params.per_page, 1, MAX_PER_PAGE) ?? DEFAULT_PER_PAGE;

  return {
    q: first(params.q).slice(0, 200),
    platforms: list(pick(params, "platform", "platforms")) as Platform[],
    allPlatforms: list(pick(params, "all", "all_platforms")) as Platform[],
    categories: list(pick(params, "category", "categories")),
    licenses: list(pick(params, "license", "licenses")),
    architectures: list(pick(params, "arch", "architectures")) as Architecture[],
    packageTypes: list(pick(params, "pkg", "package_types")) as PackageType[],
    openSource: oss === "true" ? true : oss === "false" ? false : null,
    minTrust: intOrNull(pick(params, "trust", "min_trust"), 0, 100),
    minQuality: intOrNull(pick(params, "quality", "min_quality"), 0, 100),
    updatedWithinDays: intOrNull(pick(params, "updated", "updated_within_days"), 1, 3650),
    sort: SORT_KEYS.includes(sort) ? sort : "relevance",
    page: intOrNull(params.page, 1, 10_000) ?? 1,
    perPage,
  };
}

/** Serialises filters back to a query string, omitting defaults. */
export function filtersToQuery(filters: Partial<SearchFilters>): string {
  const params = new URLSearchParams();
  const push = (key: string, value: string) => {
    if (value) params.set(key, value);
  };

  push("q", filters.q?.trim() ?? "");
  push("platform", (filters.platforms ?? []).join(","));
  push("all", (filters.allPlatforms ?? []).join(","));
  push("category", (filters.categories ?? []).join(","));
  push("license", (filters.licenses ?? []).join(","));
  push("arch", (filters.architectures ?? []).join(","));
  push("pkg", (filters.packageTypes ?? []).join(","));
  if (filters.openSource === true) push("oss", "true");
  if (filters.openSource === false) push("oss", "false");
  if (filters.minTrust != null) push("trust", String(filters.minTrust));
  if (filters.minQuality != null) push("quality", String(filters.minQuality));
  if (filters.updatedWithinDays != null) push("updated", String(filters.updatedWithinDays));
  if (filters.sort && filters.sort !== "relevance") push("sort", filters.sort);
  if (filters.page && filters.page > 1) push("page", String(filters.page));
  if (filters.perPage && filters.perPage !== DEFAULT_PER_PAGE) push("per_page", String(filters.perPage));

  return params.toString();
}

export function withFilterChange(
  current: SearchFilters,
  change: Partial<SearchFilters>,
): SearchFilters {
  // Any filter change resets pagination — page 2 of the old query is meaningless.
  return { ...current, ...change, ...(change.page === undefined ? { page: 1 } : {}) };
}

export function searchHref(filters: Partial<SearchFilters>, base = "/search"): string {
  const query = filtersToQuery(filters);
  return query ? `${base}?${query}` : base;
}

/* ------------------------------------------------------------------ */
/* Filtering                                                           */
/* ------------------------------------------------------------------ */

export function appHasAllPlatforms(app: App, platforms: Platform[]): boolean {
  return platforms.every((p) => app.platforms.includes(p));
}

export function appHasAnyPlatform(app: App, platforms: Platform[]): boolean {
  return platforms.some((p) => app.platforms.includes(p));
}

export function appHasArchitecture(app: App, architectures: Architecture[]): boolean {
  return app.architectures.some((a) => architectures.includes(a));
}

export function appHasPackageType(app: App, packageTypes: PackageType[]): boolean {
  return app.package_types.some((p) => packageTypes.includes(p));
}

export function filterApps(apps: App[], filters: SearchFilters): App[] {
  return apps.filter((app) => {
    if (filters.platforms.length && !appHasAnyPlatform(app, filters.platforms)) return false;
    if (filters.allPlatforms.length && !appHasAllPlatforms(app, filters.allPlatforms)) return false;
    if (filters.categories.length && !filters.categories.some((c) => app.categories.includes(c))) return false;
    if (filters.licenses.length) {
      const id = app.license?.id ?? "";
      if (!filters.licenses.some((l) => l.toLowerCase() === id.toLowerCase())) return false;
    }
    if (filters.architectures.length && !appHasArchitecture(app, filters.architectures)) return false;
    if (filters.packageTypes.length && !appHasPackageType(app, filters.packageTypes)) return false;
    if (filters.openSource === true && !app.open_source) return false;
    if (filters.openSource === false && app.open_source) return false;
    if (filters.minTrust != null && (app.scores.trust.value ?? -1) < filters.minTrust) return false;
    if (filters.minQuality != null && (app.scores.quality.value ?? -1) < filters.minQuality) return false;
    if (filters.updatedWithinDays != null) {
      const updated = Date.parse(app.updated_at ?? "");
      if (Number.isNaN(updated)) return false;
      if (Date.now() - updated > filters.updatedWithinDays * 86_400_000) return false;
    }
    return true;
  });
}

/* ------------------------------------------------------------------ */
/* Ranking                                                             */
/* ------------------------------------------------------------------ */

const SYNONYMS: Record<string, string[]> = {
  music: ["audio", "player", "streaming", "spotify", "playlist"],
  photo: ["photography", "image", "picture", "gallery"],
  photos: ["photography", "image", "gallery"],
  video: ["video", "media", "player", "streaming", "youtube"],
  browser: ["web", "internet", "chromium", "firefox", "chrome"],
  password: ["security", "vault", "credentials", "manager", "keepass"],
  chat: ["communication", "messaging", "im", "matrix", "xmpp"],
  mail: ["email", "communication", "imap", "smtp"],
  notes: ["productivity", "note-taking", "markdown", "writing"],
  editor: ["developer-tools", "ide", "code", "text"],
  git: ["developer-tools", "version-control", "repository"],
  torrent: ["internet", "p2p", "bittorrent", "download"],
  vpn: ["networking", "privacy", "tunnel", "wireguard"],
  sync: ["networking", "backup", "file-transfer", "replication"],
  backup: ["utilities", "sync", "archive", "restic", "borg"],
  maps: ["navigation", "gps", "osm", "openstreetmap"],
  ai: ["machine-learning", "llm", "model", "inference", "gpt"],
  terminal: ["developer-tools", "shell", "console", "emulator"],
  emulator: ["gaming", "retro", "console"],
  reader: ["books", "ebooks", "epub", "rss"],
  screenshot: ["photography", "capture", "screen"],
  record: ["video", "screen", "capture", "audio"],
  encryption: ["security", "cryptography", "privacy", "vault"],
  torrents: ["internet", "p2p"],
  download: ["internet", "fetch", "youtube-dl", "yt-dlp"],
  media: ["video", "audio", "player", "server"],
  server: ["self-hosted", "networking", "hosting"],
  clipboard: ["utilities", "productivity"],
  calendar: ["productivity", "scheduling"],
  task: ["productivity", "todo", "kanban"],
  wallpaper: ["utilities", "desktop"],
  launcher: ["utilities", "desktop", "productivity"],
  clipboard_manager: ["utilities"],
  ftp: ["networking", "file-transfer", "sftp"],
  ssh: ["networking", "developer-tools", "remote"],
  database: ["developer-tools", "sql", "storage"],
  markdown: ["productivity", "notes", "editor"],
  pdf: ["productivity", "books", "documents"],
  office: ["productivity", "documents", "suite"],
};

export function normaliseText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase();
}

export function tokenize(query: string): string[] {
  return normaliseText(query)
    .split(/[^\p{L}\p{N}+#._-]+/u)
    .map((t) => t.trim())
    .filter(Boolean);
}

/** Bounded Levenshtein distance — cheap typo tolerance. */
export function editDistance(a: string, b: string, max = 3): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev = new Array<number>(b.length + 1);
  const curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    let rowBest = curr[0];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (curr[j] < rowBest) rowBest = curr[j];
    }
    if (rowBest > max) return max + 1;
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

function fuzzyTokenMatch(haystack: string, needle: string): boolean {
  if (needle.length < 4) return false;
  return editDistance(haystack, needle, needle.length <= 6 ? 1 : 2) <= (needle.length <= 6 ? 1 : 2);
}

function tokenMatchesWord(words: string[], token: string): { exact: boolean; prefix: boolean; fuzzy: boolean } {
  let exact = false;
  let prefix = false;
  let fuzzy = false;
  for (const word of words) {
    if (word === token) {
      exact = true;
    } else if (word.startsWith(token)) {
      prefix = true;
    } else if (!fuzzy && fuzzyTokenMatch(word, token)) {
      fuzzy = true;
    }
  }
  return { exact, prefix, fuzzy };
}

/** Field weights: a name hit always outranks a tag hit. */
const FIELD_WEIGHTS = {
  name: { exact: 120, prefix: 60, fuzzy: 22, substring: 40 },
  summary: { exact: 34, prefix: 16, fuzzy: 6, substring: 12 },
  description: { exact: 14, prefix: 7, fuzzy: 2, substring: 6 },
  developer: { exact: 44, prefix: 22, fuzzy: 8, substring: 18 },
  category: { exact: 40, prefix: 22, fuzzy: 6, substring: 16 },
  tag: { exact: 34, prefix: 18, fuzzy: 5, substring: 13 },
  platform: { exact: 26, prefix: 16, fuzzy: 0, substring: 10 },
  license: { exact: 22, prefix: 14, fuzzy: 0, substring: 8 },
  features: { exact: 16, prefix: 8, fuzzy: 0, substring: 6 },
  id: { exact: 90, prefix: 45, fuzzy: 15, substring: 30 },
} as const;

type Field = keyof typeof FIELD_WEIGHTS;

function scoreField(words: string[], blob: string, token: string, field: Field): number {
  const w = FIELD_WEIGHTS[field];
  const { exact, prefix, fuzzy } = tokenMatchesWord(words, token);
  let score = 0;
  if (exact) score += w.exact;
  else if (prefix) score += w.prefix;
  else if (fuzzy) score += w.fuzzy;
  else if (blob.includes(token)) score += w.substring;
  return score;
}

export type SearchIndex = {
  app: App;
  fields: Record<Field, { words: string[]; blob: string }>;
  name: string;
};

export function buildIndex(app: App): SearchIndex {
  const toField = (value: string | null | undefined, extra: string[] = []) => {
    const text = normaliseText([value ?? "", ...extra].join(" "));
    return { words: text.split(/[^\p{L}\p{N}+#._-]+/u).filter(Boolean), blob: text };
  };

  return {
    app,
    name: normaliseText(app.name),
    fields: {
      name: toField(app.name),
      summary: toField(app.summary),
      description: toField(app.description),
      developer: toField(app.developer?.name),
      category: toField("", app.categories),
      tag: toField("", app.tags),
      platform: toField("", app.platforms),
      license: toField(app.license?.id),
      features: toField("", app.features),
      id: toField(app.id),
    },
  };
}

export function scoreApp(index: SearchIndex, tokens: string[], allTokens: string[]): number {
  if (allTokens.length === 0) return 0;

  let score = 0;
  let matchedTokens = 0;

  for (const token of allTokens) {
    const variants = [token, ...(SYNONYMS[token] ?? [])];
    let best = 0;
    for (const variant of variants) {
      let variantScore = 0;
      for (const field of Object.keys(index.fields) as Field[]) {
        variantScore += scoreField(index.fields[field].words, index.fields[field].blob, variant, field);
      }
      // Synonym matches are weaker than direct matches.
      best = Math.max(best, variant === token ? variantScore : variantScore * 0.45);
    }
    if (best > 0) matchedTokens += 1;
    score += best;
  }

  // Partial matches still rank, but behind full coverage.
  if (matchedTokens === 0) return 0;
  const coverage = matchedTokens / allTokens.length;
  score *= 0.55 + 0.45 * coverage;

  // Tie-breakers, deliberately small so relevance dominates.
  const popularity = index.app.scores.popularity.value ?? 0;
  score += (popularity / 100) * 6;

  // Phrase bonus: the whole query appearing in the name is a strong signal.
  const phrase = allTokens.join(" ");
  if (index.name.includes(phrase)) score += 40;

  return score;
}

export function searchApps(apps: App[], query: string): App[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return apps;
  const indexes = apps.map(buildIndex);
  return indexes
    .map((index) => ({ app: index.app, score: scoreApp(index, tokens, tokens) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.app.name.localeCompare(b.app.name))
    .map((entry) => entry.app);
}

/* ------------------------------------------------------------------ */
/* Sorting & pagination                                                */
/* ------------------------------------------------------------------ */

function timeValue(iso: string | null | undefined): number {
  const t = Date.parse(iso ?? "");
  return Number.isNaN(t) ? 0 : t;
}

export function sortApps(apps: App[], sort: SortKey, query = ""): App[] {
  const copy = [...apps];
  switch (sort) {
    case "popularity":
      return copy.sort(
        (a, b) => (b.scores.popularity.value ?? -1) - (a.scores.popularity.value ?? -1) || a.name.localeCompare(b.name),
      );
    case "updated":
      return copy.sort((a, b) => timeValue(b.updated_at) - timeValue(a.updated_at) || a.name.localeCompare(b.name));
    case "released":
      return copy.sort(
        (a, b) =>
          timeValue(b.signals.last_release_at) - timeValue(a.signals.last_release_at) || a.name.localeCompare(b.name),
      );
    case "newest":
      return copy.sort((a, b) => timeValue(b.created_at) - timeValue(a.created_at) || a.name.localeCompare(b.name));
    case "name":
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    case "trust":
      return copy.sort((a, b) => (b.scores.trust.value ?? -1) - (a.scores.trust.value ?? -1) || a.name.localeCompare(b.name));
    case "quality":
      return copy.sort((a, b) => (b.scores.quality.value ?? -1) - (a.scores.quality.value ?? -1) || a.name.localeCompare(b.name));
    case "relevance":
    default:
      return query ? searchApps(copy, query) : copy;
  }
}

export function paginate<T>(items: T[], page: number, perPage: number) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * perPage;
  return {
    items: items.slice(start, start + perPage),
    pagination: { page: safePage, per_page: perPage, total, total_pages: totalPages },
  };
}

/** One-shot: filter → (relevance rank | sort) → paginate. */
export function runSearch(apps: App[], filters: SearchFilters) {
  const filtered = filterApps(apps, filters);
  const sorted = sortApps(filtered, filters.sort, filters.q);
  return { ...paginate(sorted, filters.page, filters.perPage), filters };
}
