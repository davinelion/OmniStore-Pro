import { describe, expect, it } from "vitest";
import {
  EnrichmentsSchema,
  InstallRecipeSchema,
  publishedSha256,
  installCommand,
} from "./enrichment";
describe("upstream evidence", () => {
  it("accepts only SHA-256 digests and normalizes case", () => {
    expect(publishedSha256(`sha256:${"A".repeat(64)}`)).toBe("a".repeat(64));
    for (const input of [
      null,
      undefined,
      "sha256:123",
      `md5:${"a".repeat(64)}`,
    ])
      expect(publishedSha256(input)).toBeNull();
  });
  it("requires attribution and permission for contributed screenshots", () => {
    expect(
      EnrichmentsSchema.safeParse([
        {
          repository: "owner/repo",
          evidence_url: "https://example.com",
          reviewed_at: "2026-09-01T00:00:00Z",
          screenshots: [
            { url: "https://example.com/image.png", alt: "Screenshot" },
          ],
        },
      ]).success,
    ).toBe(false);
  });
  it("rejects shell injection, wrong platforms and insecure evidence", () => {
    const recipe = {
      platform: "windows",
      manager: "winget",
      package_id: "Vendor.App",
      source_url: "https://example.com",
    };
    expect(installCommand(InstallRecipeSchema.parse(recipe))).toBe(
      "winget install --exact --id Vendor.App",
    );
    for (const package_id of [
      "a;rm -rf",
      "$(id)",
      "--help",
      "a\nb",
      "a b",
      "a`id`",
      "a|b",
    ])
      expect(
        InstallRecipeSchema.safeParse({ ...recipe, package_id }).success,
      ).toBe(false);
    expect(
      InstallRecipeSchema.safeParse({ ...recipe, platform: "linux" }).success,
    ).toBe(false);
    expect(
      InstallRecipeSchema.safeParse({
        ...recipe,
        source_url: "http://example.com",
      }).success,
    ).toBe(false);
  });
});
