import { describe, expect, it } from "vitest";

import {
  NOT_AVAILABLE,
  architectureLabel,
  assetLabel,
  formatBytes,
  formatCompactNumber,
  formatNumber,
  packageTypeLabel,
  platformLabel,
  pluralize,
  relativeTime,
} from "./index";

describe("formatBytes", () => {
  it("formats byte sizes with stable units", () => {
    expect(formatBytes(null)).toBe(NOT_AVAILABLE);
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(2048)).toMatch(/2(\.0)? KB/);
    expect(formatBytes(5 * 1024 * 1024)).toMatch(/5(\.0)? MB/);
  });
});

describe("numbers", () => {
  it("renders null-safe numbers", () => {
    expect(formatNumber(undefined)).toBe(NOT_AVAILABLE);
    expect(formatNumber(12345)).toBe("12,345");
    expect(formatCompactNumber(1500)).toBe("1.5K");
  });
});

describe("labels", () => {
  it("prettifies platform identifiers", () => {
    expect(platformLabel("android")).toBe("Android");
    expect(platformLabel("macos")).toBe("macOS");
    expect(platformLabel("toaster")).toBe("toaster"); // pass-through unknowns
  });

  it("prettifies architectures and package types", () => {
    expect(architectureLabel("arm64")).toBe("ARM64 / Apple Silicon");
    expect(architectureLabel("universal")).toBe("Universal");
    expect(architectureLabel("riscv")).toBe("riscv");
    expect(packageTypeLabel("APK")).toBe("APK");
    expect(packageTypeLabel("APPIMAGE")).toBe("AppImage");
    expect(packageTypeLabel("unknown-kind")).toBe("unknown-kind");
  });

  it("composes unambiguous download labels", () => {
    expect(assetLabel({ platform: "android", package_type: "APK", architecture: "arm64" })).toBe(
      "Android APK — ARM64 / Apple Silicon",
    );
  });
});

describe("relativeTime", () => {
  it("describes elapsed time from a reference date", () => {
    const now = Date.parse("2026-09-11T12:00:00Z");
    expect(relativeTime("2026-09-11T11:00:00Z", now)).toBe("1 hour ago");
    expect(relativeTime(null, now)).toBe(NOT_AVAILABLE);
  });
});

describe("pluralize", () => {
  it("uses singular and plural forms", () => {
    expect(pluralize(1, "app")).toBe("1 app");
    expect(pluralize(3, "app")).toBe("3 apps");
  });
});
