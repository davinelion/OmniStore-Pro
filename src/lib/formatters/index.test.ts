import { describe, expect, it } from "vitest";

import {
  NOT_AVAILABLE,
  architectureLabel,
  assetLabel,
  downloadLabel,
  formatBytes,
  formatCompactNumber,
  formatDate,
  formatDateTime,
  formatNumber,
  freshnessLabel,
  packageTypeLabel,
  platformLabel,
  pluralize,
  relativeTime,
  titleCase,
} from "./index";

const NOW = Date.parse("2026-09-08T12:00:00Z");

describe("formatBytes", () => {
  it("formats sizes in binary units", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1_024)).toBe("1 KB");
    expect(formatBytes(1_048_576)).toBe("1 MB");
    expect(formatBytes(128 * 1_048_576)).toBe("128 MB");
  });

  it("reports unknown sizes instead of guessing", () => {
    expect(formatBytes(null)).toBe(NOT_AVAILABLE);
    expect(formatBytes(undefined)).toBe(NOT_AVAILABLE);
  });
});

describe("numbers", () => {
  it("formats with thousands separators", () => {
    expect(formatNumber(12_345)).toBe("12,345");
    expect(formatNumber(null)).toBe(NOT_AVAILABLE);
  });

  it("compacts large counts", () => {
    expect(formatCompactNumber(1_500)).toBe("1.5K");
    expect(formatCompactNumber(2_300_000)).toBe("2.3M");
    expect(formatCompactNumber(null)).toBe(NOT_AVAILABLE);
  });
});

describe("dates", () => {
  it("formats a date", () => {
    expect(formatDate("2026-08-21T14:02:01Z")).toBeTruthy();
    expect(formatDate(null)).toBe(NOT_AVAILABLE);
  });

  it("formats a date and time", () => {
    expect(formatDateTime("2026-08-21T14:02:01Z")).toBeTruthy();
    expect(formatDateTime(null)).toBe(NOT_AVAILABLE);
  });

  it("renders relative time", () => {
    expect(relativeTime(new Date(NOW - 3_600_000).toISOString(), NOW)).toMatch(/hour|ago/i);
    expect(relativeTime(new Date(NOW - 3 * 86_400_000).toISOString(), NOW)).toMatch(/day|ago/i);
    expect(relativeTime(null, NOW)).toBe(NOT_AVAILABLE);
  });

  it("labels freshness and tolerates invalid input", () => {
    expect(freshnessLabel(new Date(NOW - 5 * 86_400_000).toISOString(), NOW)).toBeTruthy();
    expect(freshnessLabel("not-a-date", NOW)).toBeNull();
    expect(freshnessLabel(null, NOW)).toBeNull();
  });
});

describe("labels", () => {
  it("labels platforms, architectures and package types", () => {
    expect(platformLabel("macos")).toBe("macOS");
    expect(platformLabel("ipados")).toBe("iPadOS");
    expect(architectureLabel("x86_64")).toBeTruthy();
    expect(packageTypeLabel("APPIMAGE")).toBe("AppImage");
  });

  it("produces a human download label", () => {
    const asset = {
      platform: "windows",
      architecture: "x86_64",
      package_type: "MSI",
      filename: "app.msi",
      size_bytes: 1_048_576,
    } as const;
    expect(downloadLabel(asset)).toMatch(/Windows/i);
    expect(assetLabel(asset)).toMatch(/MSI/i);
  });
});

describe("helpers", () => {
  it("pluralizes", () => {
    expect(pluralize(1, "app")).toBe("1 app");
    expect(pluralize(2, "app")).toBe("2 apps");
    expect(pluralize(2, "category", "categories")).toBe("2 categories");
  });

  it("title-cases slugs", () => {
    expect(titleCase("photo-video")).toBe("Photo Video");
  });
});
