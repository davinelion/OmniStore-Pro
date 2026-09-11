import { describe, expect, it } from "vitest";

import { sectionSlug } from "./section";

describe("sectionSlug", () => {
  it("turns headings into DOM-safe ids", () => {
    expect(sectionSlug("Top Developers")).toBe("top-developers");
    expect(sectionSlug("  Media & Music! ")).toBe("media-music");
    expect(sectionSlug("")).toBe("");
  });
});
