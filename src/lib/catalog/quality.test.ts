import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { FeedSchema } from "@/lib/schemas/omnisource";
import { localFeedProvider } from "@/lib/api/local-provider";
import { catalogApps, appQuality, catalogQuality } from "./quality";
import { escapeXml, releaseRss } from "./rss";
const apps = FeedSchema.parse(
  JSON.parse(readFileSync("data/omnisource-feed.json", "utf8")),
).apps;
describe("catalog transparency", () => {
  it("walks provider pagination without silently dropping apps", async () => {
    const spy = vi.spyOn(localFeedProvider, "getApps");
    expect((await catalogApps(localFeedProvider)).length).toBe(apps.length);
    expect(spy.mock.calls.length).toBeGreaterThan(1);
    spy.mockRestore();
  });
  it("separates unknown/stale source freshness from release age", () => {
    expect(
      appQuality({
        ...apps[0],
        source: { ...apps[0].source, fetched_at: null },
      }).freshnessUnknown,
    ).toBe(true);
    expect(
      appQuality(
        {
          ...apps[0],
          source: { ...apps[0].source, fetched_at: "2026-09-01T00:00:00Z" },
        },
        Date.parse("2026-09-16T00:00:00Z"),
      ).stale,
    ).toBe(true);
  });
  it("counts empty coverage honestly", () => {
    const report = catalogQuality([
      { ...apps[0], screenshots: [], releases: [], latest_release: null },
    ]);
    expect(report.missingScreenshots).toBe(1);
    expect(report.noAssets).toBe(1);
    expect(report.missingChecksums).toBe(0);
  });
});
describe("RSS safety", () => {
  it("escapes XML and removes control characters", () =>
    expect(escapeXml('<x> & "\u0000')).toBe("&lt;x&gt; &amp; &quot;"));
  it("does not render upstream markup and omits invalid dates", () => {
    const app = apps.find((a) => a.latest_release)!;
    const xml = releaseRss(
      [
        {
          app: { ...app, name: "<script>" },
          release: { ...app.latest_release!, released_at: "invalid" },
        },
      ],
      "https://store.example",
    );
    expect(xml).toContain("&lt;script&gt;");
    expect(xml).not.toContain("<script>");
    expect(xml).not.toContain("Invalid Date");
    expect(xml).not.toContain("<pubDate>");
  });
});
