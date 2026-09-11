// @vitest-environment happy-dom
/**
 * LibraryTabs component test — reproduces the exact client chain the e2e
 * library spec exercises: IndexedDB hydration → id resolution through the
 * SDK (mocked fetch, real wire payload) → card render.
 */
import "fake-indexeddb/auto";

import { render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

const WIRE_APP = {
  id: "keepassxc",
  slug: "keepassxc",
  name: "KeePassXC",
  short_description: "Cross-platform password manager",
  description: "KeePassXC is a password manager.",
  developer: { id: "keepassxc-org", slug: "keepassxc-org", name: "KeePassXC Team", url: null },
  categories: ["security"],
  tags: ["password"],
  platforms: ["linux"],
  license: "GPL-3.0",
  icon: null,
  screenshots: [],
  scores: { trust: 96, quality: 92, popularity: 80 },
  latest_release: {
    version: "2.1.0",
    released_at: "2026-09-01T10:00:00Z",
    notes: null,
    assets: [],
  },
  releases: [],
};

let fetchCalls: string[] = [];

vi.stubGlobal(
  "fetch",
  vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    fetchCalls.push(url);
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify(WIRE_APP),
    } as Response;
  }),
);

async function seedFavorite() {
  const { openDB } = await import("idb");
  const db = await openDB("omnistore-library", 1, {
    upgrade(database) {
      if (!database.objectStoreNames.contains("lists")) {
        database.createObjectStore("lists", { keyPath: "kind" });
      }
      if (!database.objectStoreNames.contains("collections")) {
        database.createObjectStore("collections", { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains("meta")) {
        database.createObjectStore("meta", { keyPath: "key" });
      }
    },
  });
  await db.put("lists", { kind: "favorites", appIds: ["keepassxc"] });
  db.close();
}

describe("LibraryTabs", () => {
  beforeEach(async () => {
    fetchCalls = [];
    // Fresh module graph per test = fresh module state (a "new page load").
    vi.resetModules();
    const { default: en } = await import("@/../messages/en.json");
    const messages = { library: (en as Record<string, unknown>).library };
    const { LibraryTabs } = await import("./LibraryTabs");
    await seedFavorite();
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <LibraryTabs />
      </NextIntlClientProvider>,
    );
  });

  it("hydrates the favorite from IndexedDB and renders its card", async () => {
    const link = await screen.findByRole("link", { name: /KeePassXC/i }, { timeout: 5000 });
    expect(link).toBeVisible();
    expect(fetchCalls.some((url) => url.includes("/api/v1/apps/keepassxc"))).toBe(true);
  });
});
