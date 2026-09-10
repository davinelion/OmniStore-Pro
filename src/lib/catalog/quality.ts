import type { App } from "@/lib/schemas/omnisource";
import type { OmniSourceProvider } from "@/lib/api/provider";
import { DEFAULT_FILTERS, MAX_PER_PAGE } from "@/lib/search/query";

/** Walk the contract's pagination rather than assuming a provider honors oversized limits. */
export async function catalogApps(
  provider: OmniSourceProvider,
): Promise<App[]> {
  const apps = new Map<string, App>();
  for (let page = 1; page <= 1000; page++) {
    const result = await provider.getApps({
      ...DEFAULT_FILTERS,
      page,
      perPage: MAX_PER_PAGE,
      sort: "name",
    });
    result.items.forEach((app) => apps.set(app.id, app));
    if (page >= result.pagination.total_pages || !result.items.length)
      return [...apps.values()];
  }
  throw new Error(
    "Catalog exceeds web aggregation budget; move aggregation to OmniSource.",
  );
}
export function appQuality(app: App, now = Date.now()) {
  const assets = [
    ...new Map(
      [...app.releases, ...(app.latest_release ? [app.latest_release] : [])]
        .flatMap((r) => r.assets)
        .map((a) => [a.id, a]),
    ).values(),
  ];
  const fetched = Date.parse(app.source.fetched_at ?? "");
  return {
    screenshots: app.screenshots.length,
    assets: assets.length,
    publishedChecksums: assets.filter((a) =>
      /^[a-f0-9]{64}$/i.test(a.sha256 ?? ""),
    ).length,
    validatedAssets: assets.filter((a) => a.status === "VALID").length,
    stale: !Number.isFinite(fetched) || now - fetched > 14 * 86400000,
    freshnessUnknown: !Number.isFinite(fetched),
    archived: app.signals.archived === true,
  };
}
export function catalogQuality(apps: App[], now = Date.now()) {
  const rows = apps.map((app) => ({ app, ...appQuality(app, now) }));
  return {
    rows,
    apps: apps.length,
    missingScreenshots: rows.filter((r) => !r.screenshots).length,
    missingChecksums: rows.filter(
      (r) => r.assets > 0 && r.publishedChecksums < r.assets,
    ).length,
    noAssets: rows.filter((r) => !r.assets).length,
    stale: rows.filter((r) => r.stale).length,
    archived: rows.filter((r) => r.archived).length,
    assets: rows.reduce((n, r) => n + r.assets, 0),
    checksums: rows.reduce((n, r) => n + r.publishedChecksums, 0),
    validated: rows.reduce((n, r) => n + r.validatedAssets, 0),
  };
}
