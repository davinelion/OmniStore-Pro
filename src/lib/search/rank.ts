import type { App } from "@/lib/schemas/omnisource";

const SYNONYMS: Record<string, string[]> = {
  music: ["audio", "player", "streaming"],
  photo: ["photography", "image"],
  browser: ["web", "internet"],
  password: ["security", "vault", "credentials"],
  chat: ["communication", "messaging"],
};

export function tokenize(q: string) {
  return q
    .toLowerCase()
    .split(/[\s,]+/)
    .filter(Boolean);
}

function fuzzyIncludes(hay: string, needle: string) {
  if (hay.includes(needle)) return true;
  if (needle.length < 3) return false;
  let i = 0;
  for (const ch of hay) {
    if (ch === needle[i]) i++;
    if (i === needle.length) return true;
  }
  return false;
}

export function scoreApp(app: App, query: string) {
  if (!query.trim()) return 1;
  const tokens = tokenize(query);
  const blob = [
    app.name,
    app.short_description,
    app.description,
    app.developer?.name,
    app.license,
    ...app.categories,
    ...app.tags,
    ...app.platforms,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  let score = 0;
  for (const t of tokens) {
    const extras = SYNONYMS[t] ?? [];
    if (app.name.toLowerCase() === t) score += 50;
    else if (app.name.toLowerCase().includes(t)) score += 30;
    else if (fuzzyIncludes(app.name.toLowerCase(), t)) score += 12;
    if (blob.includes(t)) score += 8;
    for (const s of extras) if (blob.includes(s)) score += 4;
  }
  score += (app.scores?.popularity ?? 0) / 25;
  return score;
}

export function searchApps(apps: App[], query: string) {
  return apps
    .map((app) => ({ app, score: scoreApp(app, query) }))
    .filter((x) => (query.trim() ? x.score > 0 : true))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.app);
}
