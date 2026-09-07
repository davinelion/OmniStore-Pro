import { readFile } from "node:fs/promises";
import path from "node:path";
import { AppSchema, type App, type Platform } from "@/lib/schemas/omnisource";
import { searchApps } from "@/lib/search/rank";
import { CATEGORIES } from "@/config/site";

type CatalogFile = { freshness?: string; apps: unknown[] };

let cache: { apps: App[]; freshness?: string } | null = null;

export async function loadCatalog() {
  if (cache) return cache;
  const file = path.join(process.cwd(), "data", "catalog.json");
  const raw = JSON.parse(await readFile(file, "utf8")) as CatalogFile;
  const apps: App[] = [];
  for (const item of raw.apps) {
    const parsed = AppSchema.safeParse(item);
    if (parsed.success) apps.push(parsed.data);
  }
  cache = { apps, freshness: raw.freshness };
  return cache;
}

export type SearchParams = {
  q?: string;
  platform?: string;
  category?: string;
  license?: string;
  architecture?: string;
  openSource?: string;
  minTrust?: string;
  minQuality?: string;
  updatedSince?: string;
  sort?: string;
  allPlatforms?: string;
};

function applyFilters(apps: App[], p: SearchParams) {
  let out = apps;
  if (p.platform) out = out.filter((a) => a.platforms.includes(p.platform as Platform));
  if (p.category) out = out.filter((a) => a.categories.includes(p.category!));
  if (p.license) out = out.filter((a) => (a.license ?? "").toLowerCase().includes(p.license!.toLowerCase()));
  if (p.architecture) {
    out = out.filter((a) =>
      (a.latest_release?.assets ?? []).some((x) => x.architecture === p.architecture)
    );
  }
  if (p.openSource === "true") out = out.filter((a) => a.open_source);
  if (p.minTrust) out = out.filter((a) => (a.scores?.trust ?? 0) >= Number(p.minTrust));
  if (p.minQuality) out = out.filter((a) => (a.scores?.quality ?? 0) >= Number(p.minQuality));
  if (p.updatedSince) {
    const t = new Date(p.updatedSince).getTime();
    out = out.filter((a) => a.updated_at && new Date(a.updated_at).getTime() >= t);
  }
  if (p.allPlatforms) {
    const needed = p.allPlatforms.split(",").filter(Boolean) as Platform[];
    out = out.filter((a) => needed.every((n) => a.platforms.includes(n)));
  }
  return out;
}

function sortApps(apps: App[], sort?: string, q?: string) {
  const copy = [...apps];
  switch (sort) {
    case "popularity":
      return copy.sort((a, b) => (b.scores?.popularity ?? 0) - (a.scores?.popularity ?? 0));
    case "updated":
      return copy.sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""));
    case "newest":
      return copy.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
    case "name":
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    case "trust":
      return copy.sort((a, b) => (b.scores?.trust ?? 0) - (a.scores?.trust ?? 0));
    default:
      return q ? searchApps(copy, q) : copy;
  }
}

export async function queryApps(p: SearchParams) {
  const { apps, freshness } = await loadCatalog();
  let list = applyFilters(apps, p);
  if (p.q && (!p.sort || p.sort === "relevance")) list = searchApps(list, p.q);
  else list = sortApps(list, p.sort, p.q);
  return { items: list, total: list.length, freshness };
}

export async function getAppBySlug(slug: string) {
  const { apps } = await loadCatalog();
  return apps.find((a) => a.slug === slug || a.id === slug);
}

export async function getRelated(ids: string[]) {
  const { apps } = await loadCatalog();
  return apps.filter((a) => ids.includes(a.id) || ids.includes(a.slug));
}

export async function getDeveloper(slug: string) {
  const { apps } = await loadCatalog();
  const owned = apps.filter((a) => a.developer?.slug === slug);
  if (!owned.length) return null;
  return { developer: owned[0].developer!, apps: owned };
}

export async function getTrending() {
  const { apps, freshness } = await loadCatalog();
  const byPop = [...apps].sort((a, b) => (b.scores?.popularity ?? 0) - (a.scores?.popularity ?? 0));
  return {
    today: byPop.slice(0, 8),
    week: byPop.slice(0, 12),
    growing: [...apps]
      .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""))
      .slice(0, 8),
    freshness,
  };
}

export async function getLatest() {
  const { apps, freshness } = await loadCatalog();
  const added = [...apps].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
  const updated = [...apps].sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""));
  return { added: added.slice(0, 12), updated: updated.slice(0, 12), freshness };
}

export async function getCategories() {
  const { apps } = await loadCatalog();
  return CATEGORIES.map((c) => ({
    ...c,
    count: apps.filter((a) => a.categories.includes(c.slug)).length,
  }));
}

export async function getHome() {
  const { apps, freshness } = await loadCatalog();
  const featured = [...apps].sort((a, b) => (b.scores?.trust ?? 0) - (a.scores?.trust ?? 0)).slice(0, 6);
  const trending = [...apps].sort((a, b) => (b.scores?.popularity ?? 0) - (a.scores?.popularity ?? 0)).slice(0, 6);
  const updated = [...apps].sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? "")).slice(0, 6);
  const newest = [...apps].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? "")).slice(0, 6);
  const cross = apps.filter((a) => a.platforms.length >= 4).slice(0, 6);
  return { featured, trending, updated, newest, cross, freshness };
}
