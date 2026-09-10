/** Offline catalog report; optional HEAD-only GitHub asset availability probe.
 * Never downloads binaries, sends credentials, or follows arbitrary hosts. */
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { FeedSchema } from "../src/lib/schemas/omnisource";
import { catalogQuality } from "../src/lib/catalog/quality";

const ALLOWED = new Set([
  "github.com",
  "release-assets.githubusercontent.com",
  "objects.githubusercontent.com",
]);
async function probe(raw: string): Promise<string> {
  try {
    let url = new URL(raw);
    for (let redirects = 0; redirects < 4; redirects++) {
      if (
        url.protocol !== "https:" ||
        !ALLOWED.has(url.hostname) ||
        url.username ||
        url.password ||
        (url.port && url.port !== "443")
      )
        return "skipped: unsupported host";
      const response = await fetch(url, {
        method: "HEAD",
        redirect: "manual",
        signal: AbortSignal.timeout(10000),
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location) return "unknown: redirect without location";
        url = new URL(location, url);
        continue;
      }
      if (response.ok) return "reachable";
      if (response.status === 404 || response.status === 410)
        return "unavailable";
      return `unknown: HTTP ${response.status}`;
    }
    return "unknown: redirect limit";
  } catch {
    return "unknown: network or timeout";
  }
}
async function main() {
  const feed = FeedSchema.parse(
    JSON.parse(await readFile("data/omnisource-feed.json", "utf8")),
  );
  const { rows, ...summary } = catalogQuality(feed.apps);
  const report: {
    generated_at: string;
    summary: typeof summary;
    apps: unknown[];
    links: unknown[];
  } = {
    generated_at: new Date().toISOString(),
    summary,
    apps: rows.map(({ app, ...quality }) => ({
      id: app.id,
      name: app.name,
      ...quality,
    })),
    links: [],
  };
  if (process.argv.includes("--links")) {
    // At most one current source-validated asset per app; bound concurrency and
    // total requests. This is a sample, not a guarantee that all downloads work.
    const assets = feed.apps
      .flatMap((app) => {
        const asset = app.latest_release?.assets.find(
          (a) => a.status === "VALID",
        );
        return asset
          ? [{ appId: app.id, assetId: asset.id, url: asset.url }]
          : [];
      })
      .slice(0, 200);
    for (let i = 0; i < assets.length; i += 4) {
      report.links.push(
        ...(await Promise.all(
          assets
            .slice(i, i + 4)
            .map(async ({ url, ...asset }) => ({
              ...asset,
              result: await probe(url),
            })),
        )),
      );
    }
  }
  await mkdir(".reports", { recursive: true });
  await writeFile(
    ".reports/catalog-health.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(summary, null, 2));
  console.log(
    "Report: .reports/catalog-health.json. Link results are samples, not security verification.",
  );
}
main().catch(() => {
  console.error(
    "Catalog report failed. Validate the bundled feed and file permissions.",
  );
  process.exitCode = 1;
});
