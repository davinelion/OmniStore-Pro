import { describe, expect, it } from "vitest";

import {
  artefactGroupKey,
  artefactPreference,
  dedupeAssets,
  detectArchitecture,
  isAllowedReleaseHost,
  isCliAsset,
  isExcludedAsset,
  isSourceArchive,
  normaliseAsset,
  validateAssetUrl,
  versionFromTag,
} from "./normalize";

/**
 * OmniSource-side normalisation rules.
 *
 * The UI never guesses a platform, architecture or package type — this module
 * (the OmniSource adapter) does, from real filenames and URLs.
 */

describe("validateAssetUrl", () => {
  it("accepts https downloads from known release hosts", () => {
    expect(validateAssetUrl("https://github.com/o/r/releases/download/v1/app.AppImage").status).toBe("VALID");
    expect(validateAssetUrl("https://objects.githubusercontent.com/o/r/app.dmg").status).toBe("VALID");
    expect(validateAssetUrl("https://download.opensuse.org/repositories/x/app.rpm").status).toBe("VALID");
  });

  it("rejects anything that is not https", () => {
    for (const url of [
      "http://github.com/o/r/releases/download/v1/app.AppImage",
      "javascript:alert(1)",
      "data:application/octet-stream;base64,AAAA",
      "file:///tmp/app.AppImage",
      "ftp://github.com/app.deb",
      "",
    ]) {
      expect(validateAssetUrl(url).status).toBe("INVALID");
    }
  });

  it("never reports an unsafe url as VALID", () => {
    for (const url of ["javascript:alert(1)", "data:text/html,<script>alert(1)</script>"]) {
      const result = validateAssetUrl(url);
      expect(result.status).not.toBe("VALID");
      expect(result.note).toBeTruthy();
    }
  });
});

describe("isAllowedReleaseHost", () => {
  it("recognises upstream release hosts", () => {
    expect(isAllowedReleaseHost("https://github.com/x")).toBe(true);
    expect(isAllowedReleaseHost("https://objects.githubusercontent.com/x")).toBe(true);
  });

  it("rejects unrelated and lookalike hosts", () => {
    expect(isAllowedReleaseHost("https://evil.example.com/app")).toBe(false);
    expect(isAllowedReleaseHost("https://github.com.evil.example.com/app")).toBe(false);
    expect(isAllowedReleaseHost("https://notgithub.com/app")).toBe(false);
    expect(isAllowedReleaseHost("not-a-url")).toBe(false);
  });
});

describe("asset classification", () => {
  it("detects source archives", () => {
    expect(isSourceArchive("v1.0.0.tar.gz")).toBe(true);
    expect(isSourceArchive("app-1.0.0.zip")).toBe(false);
  });

  it("detects small CLI tools that share a release page", () => {
    expect(isCliAsset("syncthingtray-1.0-cli-x86_64.AppImage")).toBe(true);
    expect(isCliAsset("syncthingtray-1.0-x86_64.AppImage")).toBe(false);
  });

  it("excludes source bundles named explicitly", () => {
    expect(isExcludedAsset("sources.zip")).toBe(true);
    expect(isExcludedAsset("app-1.0.0-src.tar.gz")).toBe(true);
    expect(isExcludedAsset("source-code.zip")).toBe(true);
    // A real zip-shipped app must not be thrown away.
    expect(isExcludedAsset("Bruno-2.0.0-linux.zip")).toBe(false);
  });

  it("excludes signatures, checksums and debug symbols", () => {
    for (const name of [
      "app.AppImage.sha256",
      "app.exe.asc",
      "checksums.txt",
      "app.dmg.blockmap",
      "app-x86_64.pdb",
      "sources.zip",
    ]) {
      expect(isExcludedAsset(name)).toBe(true);
    }
    for (const name of ["app.AppImage", "app-x64.msi", "app_universal.apk"]) {
      expect(isExcludedAsset(name)).toBe(false);
    }
  });

  it("detects architecture from real filenames", () => {
    expect(detectArchitecture("app-x86_64.AppImage")).toBe("x86_64");
    expect(detectArchitecture("app-aarch64.AppImage")).toBe("arm64");
    expect(detectArchitecture("app-arm64.dmg")).toBe("arm64");
    expect(detectArchitecture("app_amd64.deb")).toBe("x86_64");
    expect(detectArchitecture("app-armv7l.apk")).toBe("arm");
    expect(detectArchitecture("app-universal.dmg")).toBe("universal");
    expect(detectArchitecture("mystery-file")).toBe("any");
  });
});

describe("normaliseAsset", () => {
  it("classifies common upstream filenames", () => {
    expect(normaliseAsset("LocalSend-1.18.2-linux-x86-64.AppImage")).toMatchObject({
      platform: "linux",
      package_type: "APPIMAGE",
      architecture: "x86_64",
    });
    expect(normaliseAsset("app-1.0.0-x64.msi")).toMatchObject({ platform: "windows", package_type: "MSI" });
    expect(normaliseAsset("app-1.0.0-universal.dmg")).toMatchObject({ platform: "macos", package_type: "DMG" });
    expect(normaliseAsset("app-1.0.0-arm64.apk")).toMatchObject({ platform: "android", package_type: "APK" });
  });

  it("returns null for files it cannot classify instead of guessing", () => {
    expect(normaliseAsset("checksums.txt")).toBeNull();
  });
});

describe("artefactPreference", () => {
  // Higher score wins: dedupeAssets keeps the best variant of an artefact.
  it("prefers signed, installer-style builds over portable ones", () => {
    expect(artefactPreference("app-setup.exe", 1000)).toBeGreaterThan(
      artefactPreference("app-portable.zip", 1000),
    );
  });

  it("penalises unsigned and pre-release builds", () => {
    expect(artefactPreference("app-x86_64-unsigned.AppImage", 1000)).toBeLessThan(
      artefactPreference("app-x86_64.AppImage", 1000),
    );
    expect(artefactPreference("app-2.0.0-beta1.AppImage", 1000)).toBeLessThan(
      artefactPreference("app-2.0.0.AppImage", 1000),
    );
  });

  it("penalises CLI variants", () => {
    expect(artefactPreference("app-cli-x86_64.AppImage", 1000)).toBeLessThan(
      artefactPreference("app-x86_64.AppImage", 1000),
    );
  });

  it("breaks ties towards the larger artefact, which is usually the complete one", () => {
    expect(artefactPreference("app.AppImage", 20_000_000)).toBeGreaterThan(
      artefactPreference("app.AppImage", 2_000_000),
    );
  });
});

describe("dedupeAssets", () => {
  const asset = (id: string, url: string, filename: string) => ({
    id,
    platform: "linux" as const,
    architecture: "x86_64" as const,
    package_type: "APPIMAGE" as const,
    version: "1.0.0",
    filename,
    size_bytes: null,
    sha256: null,
    source: null,
    url,
    status: "VALID" as const,
    status_note: null,
  });

  it("removes exact duplicates by url", () => {
    const result = dedupeAssets([
      asset("a", "https://github.com/x/y.AppImage", "y.AppImage"),
      asset("b", "https://github.com/x/y.AppImage", "y.AppImage"),
    ]);
    expect(result).toHaveLength(1);
  });

  it("keeps distinct architectures of the same artefact", () => {
    const result = dedupeAssets([
      asset("a", "https://github.com/x/app-x86_64.AppImage", "app-x86_64.AppImage"),
      asset("b", "https://github.com/x/app-arm64.AppImage", "app-arm64.AppImage"),
    ]);
    expect(result).toHaveLength(2);
  });

  it("groups near-identical artefacts of the same platform and package type", () => {
    expect(artefactGroupKey("app-1.0.0-x86_64.AppImage")).toBe(artefactGroupKey("app-1.0.0-x86-64.AppImage"));
    expect(artefactGroupKey("app-1.0.0-amd64.AppImage")).toBe(artefactGroupKey("app-1.0.0-x64.AppImage"));
    expect(artefactGroupKey("app-1.0.0-arm64.AppImage")).toBe(artefactGroupKey("app-1.0.0-aarch64.AppImage"));
  });

  it("never groups different architectures together", () => {
    expect(artefactGroupKey("app-1.0.0-arm64.AppImage")).not.toBe(artefactGroupKey("app-1.0.0-arm32.AppImage"));
    expect(artefactGroupKey("app-1.0.0-arm64.AppImage")).not.toBe(artefactGroupKey("app-1.0.0-amd64.AppImage"));
  });
});

describe("versionFromTag", () => {
  it("strips the v prefix", () => {
    expect(versionFromTag("v1.18.2")).toBe("1.18.2");
    expect(versionFromTag("1.18.2")).toBe("1.18.2");
  });

  it("falls back to the raw tag", () => {
    expect(versionFromTag("nightly-2026-09-01")).toBe("nightly-2026-09-01");
    expect(versionFromTag(null)).toBe("unknown");
  });
});
