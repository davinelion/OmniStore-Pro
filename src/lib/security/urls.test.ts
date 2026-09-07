import { describe, expect, it } from "vitest";
import { isSafeUrl, sanitizeMarkdown } from "./urls";

describe("isSafeUrl", () => {
  it("allows https", () => expect(isSafeUrl("https://github.com/x")).toBe(true));
  it("rejects javascript", () => expect(isSafeUrl("javascript:alert(1)")).toBe(false));
  it("rejects data", () => expect(isSafeUrl("data:text/html,hi")).toBe(false));
});

describe("sanitizeMarkdown", () => {
  it("strips scripts", () => {
    expect(sanitizeMarkdown("<script>alert(1)</script>hi")).not.toContain("script");
  });
  it("strips javascript urls", () => {
    expect(sanitizeMarkdown("javascript:alert(1)")).not.toMatch(/javascript:/i);
  });
});
