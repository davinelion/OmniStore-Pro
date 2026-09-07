import { describe, expect, it } from "vitest";
import { searchApps } from "./rank";
import type { App } from "@/lib/schemas/omnisource";

const apps = [
  { id: "spotube", slug: "spotube", name: "Spotube", short_description: "music client", categories: ["audio"], tags: ["music"], platforms: ["android"], open_source: true, screenshots: [], alternatives: [], similar: [], scores: { popularity: 80 } },
  { id: "gimp", slug: "gimp", name: "GIMP", short_description: "image editor", categories: ["photography"], tags: ["image"], platforms: ["linux"], open_source: true, screenshots: [], alternatives: [], similar: [] },
] as unknown as App[];

describe("searchApps", () => {
  it("ranks name matches first", () => {
    const r = searchApps(apps, "spotube");
    expect(r[0].id).toBe("spotube");
  });
  it("matches synonyms for music", () => {
    const r = searchApps(apps, "music");
    expect(r.some((a) => a.id === "spotube")).toBe(true);
  });
  it("returns all when query empty", () => {
    expect(searchApps(apps, "").length).toBe(2);
  });
});
