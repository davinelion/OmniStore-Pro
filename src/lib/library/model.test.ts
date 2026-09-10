import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { FeedSchema } from "@/lib/schemas/omnisource";
import {
  parseLibrary,
  parseSharedList,
  shareList,
  updateItems,
  releaseKey,
} from "./model";
const app = FeedSchema.parse(
  JSON.parse(readFileSync("data/omnisource-feed.json", "utf8")),
).apps.find((a) => a.releases.length > 0)!;
const list = {
  id: "one",
  name: "বাংলা toolkit",
  entries: [{ appId: app.id, note: "private note" }],
};
describe("personal library", () => {
  it("round trips unicode without publishing notes", () => {
    const shared = parseSharedList(shareList(list));
    expect(shared.name).toBe(list.name);
    expect(shared.entries[0].note).toBe("");
    expect(shareList(list)).not.toContain("private");
  });
  it("backs up private notes", () =>
    expect(
      parseLibrary(JSON.stringify({ version: 1, lists: [list] })).lists[0],
    ).toEqual(list));
  it("rejects malformed and oversized backups", () => {
    for (const raw of [
      "no json",
      '{"version":2,"lists":[]}',
      "x".repeat(1024 * 1024 + 1),
    ])
      expect(() => parseLibrary(raw)).toThrow();
  });
  it("rejects duplicate list IDs and duplicate app IDs", () => {
    expect(() =>
      parseLibrary(JSON.stringify({ version: 1, lists: [list, list] })),
    ).toThrow();
    expect(() =>
      parseLibrary(
        JSON.stringify({
          version: 1,
          lists: [{ ...list, entries: [list.entries[0], list.entries[0]] }],
        }),
      ),
    ).toThrow();
  });
  it("rejects malformed shared fragments", () => {
    for (const raw of ["%", "%7B%7D", "x".repeat(12001)])
      expect(() => parseSharedList(raw)).toThrow();
  });
});
describe("release inbox", () => {
  const stable = {
    ...app.releases[0],
    id: "stable",
    prerelease: false,
    released_at: "2026-09-01T00:00:00Z",
  };
  const beta = {
    ...stable,
    id: "beta",
    prerelease: true,
    released_at: "2026-09-02T00:00:00Z",
  };
  const sample = { ...app, releases: [stable, beta], latest_release: beta };
  it("filters prereleases and deduplicates latest release", () => {
    expect(
      updateItems([sample], { prereleases: false, platform: "all" }).map(
        (i) => i.release.id,
      ),
    ).toEqual(["stable"]);
    expect(
      updateItems([sample], { prereleases: true, platform: "all" }).map(
        (i) => i.release.id,
      ),
    ).toEqual(["beta", "stable"]);
  });
  it("requires release assets for platform matching", () => {
    expect(
      updateItems(
        [
          {
            ...sample,
            releases: [{ ...stable, assets: [] }],
            latest_release: null,
          },
        ],
        { prereleases: true, platform: "linux" },
      ),
    ).toEqual([]);
  });
  it("uses collision-resistant app-scoped keys", () =>
    expect(releaseKey("a:b", "c")).not.toBe(releaseKey("a", "b:c")));
});
