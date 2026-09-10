import { EnrichmentsSchema, enrichApp, publishedSha256 } from "../src/lib/omnisource/enrichment";
/**
 * OmniSource ingestion pipeline.
 *
 * Fetches LIVE upstream metadata (GitHub repository + releases + README),
 * normalises release artefacts, computes transparent scores, derives
 * relationships, validates everything against the OmniSource v1 schema and
 * writes a versioned feed consumed by every OmniStore client.
 *
 * Nothing in the output is hand-authored: versions, dates, sizes, licences and
 * download URLs all come from the upstream API. Fields upstream does not
 * publish (screenshots, features) are emitted as empty and rendered as
 * "Not available" — never invented.
 *
 * Usage:
 *   GITHUB_TOKEN=xxx npm run ingest
 *   npm run ingest -- --only localsend/localsend
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import type {
  App,
  Architecture,
  Asset,
  Category,
  PackageType,
  Platform,
  PlatformInfo,
  Release,
} from "../src/lib/schemas/omnisource";
import { FeedSchema, AppSchema } from "../src/lib/schemas/omnisource";
import { licenseFromSpdx, isOpenSourceLicense } from "../src/config/licenses";
import { CATEGORIES, PLATFORM_INFO } from "../src/config/site";
import { COLLECTIONS } from "../src/config/collections";
import {
  dedupeAssets,
  normaliseAsset,
  validateAssetUrl,
  versionFromTag,
} from "../src/lib/omnisource/normalize";
import { computeScores } from "../src/lib/scores/compute";
import { decodeEntities, stripEmojiShortcodes, tidyText } from "../src/lib/omnisource/text";

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

const ROOT = path.resolve(__dirname, "..");
const SOURCES_FILE = path.join(ROOT, "data", "sources.json");
const FEED_FILE = path.join(ROOT, "data", "omnisource-feed.json");
const REPORT_FILE = path.join(ROOT, "data", "ingest-report.json");

const args = process.argv.slice(2);
const only = args.find((a) => a.startsWith("--only="))?.replace("--only=", "");
const outArg = args.find((a) => a.startsWith("--out="))?.replace("--out=", "");
const forceArg = args.includes("--force");
const CONCURRENCY = 4;
const MAX_RELEASES = 6;
const MAX_ASSETS_PER_RELEASE = 40;
const MAX_NOTES_CHARS = 1500;
const MAX_DESCRIPTION_CHARS = 1000;

const API = "https://api.github.com";

function resolveToken(): string | null {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN;
  try {
    const token = execFileSync("gh", ["auth", "token"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    return token || null;
  } catch {
    return null;
  }
}

const token = resolveToken();

/* ------------------------------------------------------------------ */
/* GitHub client                                                       */
/* ------------------------------------------------------------------ */

type GhRepo = {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  subscribers_count: number;
  created_at: string;
  pushed_at: string;
  archived: boolean;
  topics?: string[];
  license: { spdx_id: string | null; name: string } | null;
  owner: { login: string; html_url: string; avatar_url: string; type: string; name?: string | null };
};

type GhRelease = {
  id: number;
  tag_name: string;
  name: string | null;
  body: string | null;
  draft: boolean;
  prerelease: boolean;
  published_at: string | null;
  html_url: string;
  assets: Array<{ id: number; name: string; size: number; browser_download_url: string; content_type: string; digest?: string | null }>;
};

/** Fetches a raw (non-JSON) response, e.g. a README rendered as plain text. */
async function ghText(url: string): Promise<string | null> {
  if (rateLimited) throw new Error("rate_limited");
  requestCount += 1;
  const res = await fetch(url, {
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
      Accept: "application/vnd.github.raw",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "OmniSource-Ingest/1.0",
    },
  });
  if (res.status === 404 || res.status === 451) return null;
  if (res.status === 403 || res.status === 429) {
    const reset = Number(res.headers.get("x-ratelimit-reset") ?? 0);
    const waitMs = Math.max(0, reset * 1000 - Date.now());
    if (waitMs > 120_000) {
      rateLimited = true;
      throw new Error(`rate_limited: resets in ${Math.round(waitMs / 1000)}s`);
    }
    await new Promise((r) => setTimeout(r, waitMs + 1000));
    return ghText(url);
  }
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return await res.text();
}

let requestCount = 0;
let rateLimited = false;

async function gh<T>(url: string, accept = "application/vnd.github+json"): Promise<T | null> {
  if (rateLimited) throw new Error("rate_limited");
  requestCount += 1;
  const res = await fetch(url, {
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
      Accept: accept,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "OmniSource-Ingest/1.0",
    },
  });

  if (res.status === 404 || res.status === 451) return null;
  if (res.status === 403 || res.status === 429) {
    const reset = Number(res.headers.get("x-ratelimit-reset") ?? 0);
    const waitMs = Math.max(0, reset * 1000 - Date.now());
    if (waitMs > 120_000) {
      rateLimited = true;
      throw new Error(`rate_limited: resets in ${Math.round(waitMs / 1000)}s`);
    }
    await new Promise((r) => setTimeout(r, waitMs + 1000));
    return gh<T>(url, accept);
  }
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} for ${url}`);
  }
  return (await res.json()) as T;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Turns an upstream README into readable prose.
 *
 * Badges, shields, link-reference definitions, HTML and tables are stripped so
 * the "About" section renders as sentences. The first substantive paragraph
 * wins; if none is long enough we fall back to concatenating the next ones.
 */
function cleanText(input: string | null | undefined): string | null {
  if (!input) return null;

  const stripped = stripEmojiShortcodes(decodeEntities(input))
    .replace(/\r/g, "")
    .replace(/<!--[\s\S]*?-->/g, " ")
    // Badge/shield blocks and images, in both inline and reference form.
    .replace(/\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)/g, " ")
    .replace(/\[!\[[^\]]*\]\[[^\]]*\]\]\[[^\]]*\]/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/!\[[^\]]*\]\[[^\]]*\]/g, " ")
    .replace(/^\[[^\]]+\]:\s*\S+.*$/gm, "") // link reference definitions
    .replace(/<\s*(img|svg|picture|video|source|iframe|script|style)[^>]*>[\s\S]*?<\/\s*\1\s*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\[[^\]]*\]/g, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^\s{0,3}([-*+]|\d+\.)\s+/gm, "")
    .replace(/^\s*\|.*\|\s*$/gm, "") // markdown table rows
    .replace(/[`*_~]/g, "")
    .replace(/^\s*(---+|\*\*\*+|===+)\s*$/gm, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  const paragraphs = stripped
    .split(/\n{1,}/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !/^(https?:\/\/|<?https?:\/\/)/i.test(line))
    .filter((line) => !/^\s*(badge|shields?|logo)\b/i.test(line))
    .filter((line) => /[a-z]/i.test(line));

  // Section headings and table-of-contents fragments are not prose.
  const HEADING =
    /^(about|overview|introduction|screenshots?|downloads?|how it works|getting started|quick ?start|features?|installation|install|documentation|docs|contributing|license|licence|sponsors?|table of contents|contents|requirements|usage|build|building|support|faq|changelog|roadmap|links?|community|thanks|acknowledgm\w*|demo|why|goals?|toc)\b[\s:.\-–—]*$/i;

  // Prefer the first real paragraph (a sentence, not a nav/list fragment).
  const start = paragraphs.findIndex((p) => p.length >= 90 && p.split(" ").length >= 15);
  if (start === -1) {
    const joined = paragraphs.slice(0, 6).join(" ").trim();
    return joined.length >= 40 ? joined : null;
  }

  const collected: string[] = [];
  for (const paragraph of paragraphs.slice(start)) {
    if (collected.length && (HEADING.test(paragraph) || paragraph.endsWith(":"))) break;
    collected.push(paragraph);
    if (collected.join("\n\n").length >= MAX_DESCRIPTION_CHARS) break;
  }
  return truncate(collected.join("\n\n").trim(), MAX_DESCRIPTION_CHARS);
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  const cut = value.slice(0, max);
  const lastStop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("\n\n"));
  return `${(lastStop > max * 0.5 ? cut.slice(0, lastStop + 1) : cut).trim()}…`;
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

/* ------------------------------------------------------------------ */
/* Asset building                                                      */
/* ------------------------------------------------------------------ */

function buildAssets(release: GhRelease, version: string): Asset[] {
  const candidates = release.assets
    .filter((a) => !a.name.toLowerCase().endsWith(".torrent"))
    .slice(0, MAX_ASSETS_PER_RELEASE * 3)
    .map((raw): Asset | null => {
      const normalised = normaliseAsset(raw.name, raw.size);
      if (!normalised) return null;
      const validation = validateAssetUrl(raw.browser_download_url);
      if (validation.status === "INVALID") return null;
      return {
        id: String(raw.id),
        platform: normalised.platform,
        architecture: normalised.architecture,
        package_type: normalised.package_type,
        version,
        filename: normalised.filename,
        size_bytes: raw.size ?? null,
        // GitHub may publish a digest; retain only well-formed SHA-256, never infer one.
        sha256: publishedSha256(raw.digest),
        source: "GitHub Release",
        url: raw.browser_download_url,
        status: validation.status,
        status_note: validation.note,
      };
    })
    .filter((a): a is Asset => a !== null);

  const deduped = dedupeAssets(candidates);

  // Stable, human-predictable ordering: platform, then architecture, then file name.
  const platformOrder = PLATFORM_INFO.map((p) => p.slug);
  const archOrder: Architecture[] = ["universal", "arm64", "x86_64", "arm", "x86", "any"];

  return deduped
    .sort((a, b) => {
      const p = platformOrder.indexOf(a.platform) - platformOrder.indexOf(b.platform);
      if (p !== 0) return p;
      const arch = archOrder.indexOf(a.architecture) - archOrder.indexOf(b.architecture);
      if (arch !== 0) return arch;
      return (a.filename ?? "").localeCompare(b.filename ?? "");
    })
    .slice(0, MAX_ASSETS_PER_RELEASE);
}

function buildReleases(releases: GhRelease[], appName?: string | null): Release[] {
  const out: Release[] = [];
  releases.slice(0, MAX_RELEASES).forEach((release, index) => {
    const version = versionFromTag(release.tag_name, appName) || release.tag_name;
    // Only the newest release keeps its asset list: history is for the
    // changelog, the download panel serves the current release. This keeps the
    // feed small enough to ship and fast to parse on cold start.
    const assets = index === 0 ? buildAssets(release, version) : [];
    if (index === 0 && assets.length === 0) return;
    out.push({
      id: String(release.id),
      version,
      tag: release.tag_name ?? null,
      name: release.name ?? null,
      released_at: release.published_at ?? null,
      notes: release.body
        ? truncate(stripEmojiShortcodes(decodeEntities(release.body)).trim(), MAX_NOTES_CHARS)
        : null,
      prerelease: release.prerelease,
      url: release.html_url ?? null,
      assets,
    });
  });
  return out;
}

/* ------------------------------------------------------------------ */
/* App building                                                        */
/* ------------------------------------------------------------------ */

type Seed = { repo: string; categories: string[]; tags: string[]; include_prerelease?: boolean; name?: string };

async function buildApp(seed: Seed, takenSlugs: Set<string>): Promise<{ app: App | null; note?: string }> {
  const [owner, name] = seed.repo.split("/");
  const repo = (await gh<GhRepo>(`${API}/repos/${owner}/${name}`)) as GhRepo | null;
  if (!repo) return { app: null, note: `not found: ${seed.repo}` };

  const releasesRaw = (await gh<GhRelease[]>(
    `${API}/repos/${owner}/${name}/releases?per_page=100`,
  )) as GhRelease[] | null;

  // Projects that only publish pre-release builds can opt in; the release
  // record still carries `prerelease: true` so the UI can label it.
  const usable = (releasesRaw ?? []).filter((r) => !r.draft && (seed.include_prerelease || !r.prerelease));
  const releases = buildReleases(usable, seed.name ?? repo.name);
  if (releases.length === 0) {
    return { app: null, note: `no distributable release assets: ${seed.repo}` };
  }

  const readme = await ghText(`${API}/repos/${owner}/${name}/readme`);
  const description = cleanText(typeof readme === "string" ? readme : "");

  let slug = slugify(repo.name);
  if (!slug || takenSlugs.has(slug)) slug = slugify(`${repo.owner.login}-${repo.name}`);
  takenSlugs.add(slug);

  const license = licenseFromSpdx(repo.license?.spdx_id ?? null);
  const topics = (repo.topics ?? []).slice(0, 12);
  const categories = seed.categories.filter((c) => CATEGORIES.some((cat) => cat.slug === c));

  const latest = releases[0];
  // Availability reflects what a user can install right now, i.e. the
  // platforms covered by the newest release's packages.
  const platforms = unique(latest.assets.map((a) => a.platform)) as Platform[];
  const architectures = unique(latest.assets.map((a) => a.architecture)) as Architecture[];
  const packageTypes = unique(latest.assets.map((a) => a.package_type)) as PackageType[];

  // Release statistics come from the full upstream release list, not from the
  // handful of releases we retain in the feed.
  const allReleaseDates = usable
    .filter((r) => r.published_at)
    .map((r) => Date.parse(r.published_at as string))
    .filter((t) => !Number.isNaN(t))
    .sort((a, b) => b - a);

  const gaps: number[] = [];
  for (let i = 0; i < Math.min(allReleaseDates.length - 1, 10); i++) {
    gaps.push((allReleaseDates[i] - allReleaseDates[i + 1]) / 86_400_000);
  }

  const datedReleases = usable
    .filter((r) => r.published_at)
    .sort((a, b) => Date.parse(b.published_at as string) - Date.parse(a.published_at as string));

  const lastReleaseAt = datedReleases[0]?.published_at ?? releases[0]?.released_at ?? null;
  const firstReleaseAt =
    datedReleases[datedReleases.length - 1]?.published_at ?? releases[releases.length - 1]?.released_at ?? null;
  const updatedAt = [lastReleaseAt, repo.pushed_at].filter(Boolean).sort().pop() ?? null;

  const app: App = {
    id: slug,
    slug,
    name: seed.name ?? repo.name,
    summary: tidyText(repo.description) ? truncate(tidyText(repo.description)!, 180) : null,
    description: description ? truncate(description, MAX_DESCRIPTION_CHARS) : null,
    features: [],
    developer: {
      id: repo.owner.login,
      slug: slugify(repo.owner.login),
      name: repo.owner.name && repo.owner.name.trim() ? repo.owner.name.trim() : repo.owner.login,
      type: repo.owner.type === "Organization" ? "Organization" : "User",
      url: repo.owner.html_url,
      avatar_url: repo.owner.avatar_url,
    },
    categories,
    tags: unique([...seed.tags, ...topics]).slice(0, 16),
    platforms,
    architectures,
    package_types: packageTypes,
    license,
    open_source: isOpenSourceLicense(repo.license?.spdx_id ?? null),
    active_development: !repo.archived,
    icon_url: repo.owner.avatar_url,
    screenshots: [],
    scores: computeScores({
      license,
      openSource: isOpenSourceLicense(repo.license?.spdx_id ?? null),
      assets: latest.assets.map((a) => ({ status: a.status })),
      signals: {
        stars: repo.stargazers_count ?? null,
        forks: repo.forks_count ?? null,
        open_issues: repo.open_issues_count ?? null,
        watchers: repo.subscribers_count ?? null,
        repo_created_at: repo.created_at ?? null,
        repo_pushed_at: repo.pushed_at ?? null,
        release_count: datedReleases.length || releases.length,
        first_release_at: firstReleaseAt,
        last_release_at: lastReleaseAt,
        release_cadence_days: median(gaps),
        archived: repo.archived,
      },
      metadata: {
        hasSummary: Boolean(repo.description),
        hasDescription: Boolean(description),
        hasHomepage: Boolean(repo.homepage),
        hasDocumentation: Boolean(description),
        hasIcon: Boolean(repo.owner.avatar_url),
        hasFeatures: false,
        categoryCount: categories.length,
        tagCount: topics.length,
        platformCount: platforms.length,
      },
    }),
    signals: {
      stars: repo.stargazers_count ?? null,
      forks: repo.forks_count ?? null,
      open_issues: repo.open_issues_count ?? null,
      watchers: repo.subscribers_count ?? null,
      repo_created_at: repo.created_at ?? null,
      repo_pushed_at: repo.pushed_at ?? null,
      release_count: datedReleases.length || releases.length,
      first_release_at: firstReleaseAt,
      last_release_at: lastReleaseAt,
      release_cadence_days: median(gaps),
      archived: repo.archived,
    },
    links: {
      repository: repo.html_url,
      homepage: repo.homepage && /^https:\/\//.test(repo.homepage) ? repo.homepage : null,
      documentation: null,
      releases: `${repo.html_url}/releases`,
      issue_tracker: `${repo.html_url}/issues`,
    },
    source: {
      name: "GitHub",
      repo: repo.full_name,
      url: repo.html_url,
      status: repo.archived ? "DEGRADED" : "HEALTHY",
      fetched_at: new Date().toISOString(),
    },
    latest_release: latest,
    releases,
    alternatives: [],
    similar: [],
    created_at: repo.created_at ?? null,
    updated_at: updatedAt,
  };

  const parsed = AppSchema.safeParse(app);
  if (!parsed.success) {
    return { app: null, note: `schema rejected ${seed.repo}: ${parsed.error.issues[0]?.message}` };
  }
  return { app: parsed.data };
}

/* ------------------------------------------------------------------ */
/* Relationships (computed, never hand-authored)                       */
/* ------------------------------------------------------------------ */

function similarity(a: App, b: App): number {
  let score = 0;

  const sharedCategories = a.categories.filter((c) => b.categories.includes(c));
  score += sharedCategories.length * 3;

  const sharedTags = a.tags.filter((t) => b.tags.includes(t));
  score += Math.min(sharedTags.length, 6) * 0.8;

  const aPlatforms = new Set(a.platforms);
  const sharedPlatforms = b.platforms.filter((p) => aPlatforms.has(p)).length;
  const unionPlatforms = new Set([...a.platforms, ...b.platforms]).size || 1;
  score += (sharedPlatforms / unionPlatforms) * 2.5;

  if (a.license?.id && a.license.id === b.license?.id) score += 0.5;
  if (a.developer?.id && a.developer.id === b.developer?.id) score += 4;

  // Same platform set + same category is the strongest "alternative" signal.
  if (sharedCategories.length > 0 && sharedPlatforms === Math.min(a.platforms.length, b.platforms.length)) {
    score += 2;
  }

  return score;
}

function computeRelationships(apps: App[]): void {
  for (const app of apps) {
    const scored = apps
      .filter((other) => other.id !== app.id)
      .map((other) => ({ id: other.id, score: similarity(app, other) }))
      .filter((entry) => entry.score >= 2.5)
      .sort((a, b) => b.score - a.score);

    app.alternatives = scored.slice(0, 4).map((s) => s.id);
    app.similar = scored.slice(0, 8).map((s) => s.id);
  }
}

/* ------------------------------------------------------------------ */
/* Taxonomy                                                            */
/* ------------------------------------------------------------------ */

function buildCategories(apps: App[]): Category[] {
  return CATEGORIES.map((c) => ({
    slug: c.slug,
    name: c.name,
    description: c.description,
    app_count: apps.filter((a) => a.categories.includes(c.slug)).length,
  })).filter((c) => c.app_count > 0);
}

function buildPlatforms(apps: App[]): PlatformInfo[] {
  return PLATFORM_INFO.map((p) => ({
    slug: p.slug,
    name: p.name,
    description: p.description,
    app_count: apps.filter((a) => a.platforms.includes(p.slug)).length,
    install_methods: [...p.install_methods],
  }));
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

/** Reads the app count of an existing feed without validating it. */
async function readAppCount(file: string): Promise<number | null> {
  try {
    const raw = await readFile(file, "utf8");
    const parsed = JSON.parse(raw) as { apps?: unknown[]; meta?: { app_count?: number } };
    return parsed.apps?.length ?? parsed.meta?.app_count ?? null;
  } catch {
    return null;
  }
}

async function main() {
  if (!token) {
    console.warn(
      "⚠️  No GITHUB_TOKEN found. Unauthenticated GitHub API allows 60 requests/hour and will fail for a full ingest.",
    );
  }

  const raw = JSON.parse(await readFile(SOURCES_FILE, "utf8")) as { sources: Seed[] };
  let seeds = raw.sources;
  if (only) seeds = seeds.filter((s) => s.repo === only);

  console.log(`Ingesting ${seeds.length} sources${token ? " (authenticated)" : " (unauthenticated)"}…`);

  const apps: App[] = [];
  const skipped: Array<{ repo: string; reason: string }> = [];
  const taken = new Set<string>();

  let index = 0;
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (true) {
      const current = index++;
      if (current >= seeds.length) return;
      const seed = seeds[current];
      try {
        const { app, note } = await buildApp(seed, taken);
        if (app) {
          apps.push(app);
          process.stdout.write(`  ✓ ${seed.repo} (${app.platforms.join(", ") || "no platform"})\n`);
        } else {
          skipped.push({ repo: seed.repo, reason: note ?? "unknown" });
          process.stdout.write(`  · ${seed.repo} — ${note}\n`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        skipped.push({ repo: seed.repo, reason: message });
        process.stdout.write(`  ✗ ${seed.repo} — ${message}\n`);
        if (message.startsWith("rate_limited")) throw error;
      }
    }
  });

  try {
    await Promise.all(workers);
  } catch (error) {
    console.error(`\nIngest aborted: ${error instanceof Error ? error.message : error}`);
    console.error(`Kept ${apps.length} apps fetched before the failure. Re-run after the rate limit resets.`);
    if (apps.length === 0) process.exit(1);
  }

  // `--only` updates sources inside the existing feed; a full run replaces it.
  // Without this, `--only=owner/repo` would silently write a one-app feed.
  let previous: App[] = [];
  if (only) {
    try {
      const existing = JSON.parse(await readFile(outArg ? path.resolve(ROOT, outArg) : FEED_FILE, "utf8"));
      previous = (existing.apps ?? []).filter((app: App) => !apps.some((next: App) => next.id === app.id));
      console.log(`\nMerging into the existing feed (${previous.length} untouched apps).`);
    } catch {
      console.log("\nNo readable existing feed — writing fresh.");
    }
  }

  const evidence = EnrichmentsSchema.parse(JSON.parse(await readFile(path.join(ROOT, "data", "enrichments.json"), "utf8")));
  const byRepo = new Map(evidence.map(row => [row.repository.toLowerCase(), row]));
  const all = [...previous, ...apps].map(app => enrichApp(app, byRepo.get(app.source.repo?.toLowerCase() ?? "")));
  all.sort((a, b) => a.name.localeCompare(b.name));
  computeRelationships(all);

  const feed = {
    meta: {
      api_version: "1",
      generated_at: new Date().toISOString(),
      generator: "omnisource-ingest/1.0.0 (github)",
      upstream: "github",
      app_count: all.length,
    },
    apps: all,
    categories: buildCategories(all),
    platforms: buildPlatforms(all),
    collections: COLLECTIONS,
  };

  const parsed = FeedSchema.safeParse(feed);
  if (!parsed.success) {
    console.error("\nFeed failed schema validation:");
    for (const issue of parsed.error.issues.slice(0, 20)) {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  const outFile = outArg ? path.resolve(ROOT, outArg) : FEED_FILE;

  // Safety net: a partial ingest (expired credentials, network failure) must
  // never replace a good feed with a smaller one. Override with --force.
  const previousCount = await readAppCount(outFile);
  const shrank = previousCount !== null && all.length < previousCount;
  const failedFetches = skipped.filter((s) => !/no distributable|not found|moved/i.test(s.reason));
  if (shrank && failedFetches.length > 0 && !forceArg) {
    console.error(
      `\nRefusing to overwrite ${path.relative(ROOT, outFile)}: it holds ${previousCount} apps, ` +
        `this run produced ${all.length} with ${failedFetches.length} failed fetches.`,
    );
    console.error("Fix the upstream problem, or re-run with --force to accept the smaller feed.");
    process.exit(2);
  }

  await writeFile(outFile, `${JSON.stringify(parsed.data, null, 2)}\n`, "utf8");

  const report = {
    generated_at: feed.meta.generated_at,
    api_requests: requestCount,
    apps: all.length,
    skipped,
    categories: feed.categories.length,
    platforms: feed.platforms.map((p) => ({ slug: p.slug, app_count: p.app_count })),
    apps_without_checksums: all.filter((a) => a.releases.every((r) => r.assets.every((s) => !s.sha256))).length,
    apps_without_screenshots: all.filter((a) => a.screenshots.length === 0).length,
  };
  await writeFile(REPORT_FILE, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(`\nWrote ${all.length} apps to ${path.relative(ROOT, outFile)}`);
  console.log(`API requests: ${requestCount} · skipped: ${skipped.length}`);
  if (skipped.length) {
    console.log("\nSkipped sources:");
    for (const s of skipped) console.log(`  - ${s.repo}: ${s.reason}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
