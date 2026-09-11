import { expect, test } from "@playwright/test";

import { waitForLibraryWrite } from "./helpers/library";

/**
 * End-to-end acceptance tests for the marketplace surfaces: browse, search,
 * app detail, collections, taxonomy and library.
 */

test.describe("browse and search", () => {
  test("browse lists apps and filters by category", async ({ page }) => {
    await page.goto("/apps");

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: /LocalSend/ }).first()).toBeVisible();

    // Filter by the "Utilities" category via the client island.
    await page.getByRole("combobox", { name: "Category" }).selectOption("utilities");
    await expect(page).toHaveURL(/category=utilities/);
    await expect(page.getByRole("link", { name: /LocalSend/ }).first()).toBeVisible();
  });

  test("search returns ranked results with a result count", async ({ page }) => {
    await page.goto("/search?q=notes");

    await expect(page.getByText(/results?/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Joplin/ }).first()).toBeVisible();
  });

  test("search without a query shows the empty state, not an error", async ({ page }) => {
    await page.goto("/search");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});

test.describe("app detail", () => {
  test("overview shows identity, install handoff and trust evidence", async ({ page }) => {
    await page.goto("/app/localsend");

    await expect(page.getByRole("heading", { level: 1, name: "LocalSend" })).toBeVisible();
    await expect(page.getByText(/Share files to nearby devices/).first()).toBeVisible();

    // Install panel: only VALID assets are offered as downloads.
    const download = page.getByRole("link", { name: /Download/i }).first();
    await expect(download).toBeVisible();
    await expect(download).toHaveAttribute("href", /releases\/download/);

    // Trust badge panel is rendered from the OmniSource trust report.
    await expect(page.getByText(/Verified|Verified badge/i).first()).toBeVisible();
  });

  test("releases page lists the version timeline", async ({ page }) => {
    await page.goto("/app/localsend/releases");

    await expect(page.getByText("2.1.0").first()).toBeVisible();
    await expect(page.getByText("2.0.0").first()).toBeVisible();
  });

  test("security dashboard renders score and scan evidence", async ({ page }) => {
    await page.goto("/app/localsend/security");

    await expect(page.getByRole("heading", { level: 1, name: /security/i })).toBeVisible();
    await expect(page.getByText(/Passed/i).first()).toBeVisible();
    await expect(page.getByText(/metadata_integrity|Scan evidence|Vulnerabilities/i).first()).toBeVisible();
  });
});

test.describe("collections and taxonomy", () => {
  test("collections index links into collection detail", async ({ page }) => {
    await page.goto("/collections");

    await expect(page.getByRole("link", { name: /Featured/ }).first()).toBeVisible();

    await page.goto("/collection/featured");
    await expect(page.getByRole("heading", { level: 1, name: "Featured" })).toBeVisible();
    await expect(page.getByRole("link", { name: /LocalSend/ }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /KeePassXC/ }).first()).toBeVisible();
  });

  test("categories index and category detail work", async ({ page }) => {
    await page.goto("/categories");
    await expect(page.getByRole("link", { name: /Utilities/ }).first()).toBeVisible();

    await page.goto("/categories/utilities");
    await expect(page.getByRole("link", { name: /LocalSend/ }).first()).toBeVisible();
  });

  test("developers index and developer detail work", async ({ page }) => {
    await page.goto("/developers");
    await expect(page.getByText(/LocalSend Team|KeePassXC Team/i).first()).toBeVisible();

    await page.goto("/developers/localsend-org");
    await expect(page.getByRole("link", { name: /LocalSend/ }).first()).toBeVisible();
  });
});

test.describe("library", () => {

  test("favorites added on the app page persist to the library", async ({ page }) => {
    // TEMPORARY DIAGNOSTICS: capture client-side crashes during hydration.
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(String(error)));
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text().slice(0, 300));
    });

    await page.goto("/app/keepassxc");

    const favorite = page.getByRole("button", { name: /favorite/i });
    await expect(favorite).toBeVisible();
    await favorite.click();
    await expect(favorite).toHaveAttribute("aria-pressed", "true");

    // The store update is synchronous but the IndexedDB write is async —
    // wait for it to commit or the navigation can abort the transaction.
    await waitForLibraryWrite(page, { kind: "favorites", appId: "keepassxc" });

    await page.goto("/favorites");
    await expect(page.getByRole("heading", { level: 1, name: /My library/i })).toBeVisible();

    try {
      await expect(page.getByRole("link", { name: /KeePassXC/ }).first()).toBeVisible({
        timeout: 8000,
      });
    } catch {
      const state = await page.evaluate(() => ({
        hasReactRoot: document.querySelector("main")?.children.length ?? 0,
        mainText: (document.querySelector("main")?.textContent ?? "").slice(0, 200),
      }));
      throw new Error(
        `LIBRARY DIAGNOSTICS >>> pageErrors=${JSON.stringify(pageErrors)} consoleErrors=${JSON.stringify(consoleErrors)} state=${JSON.stringify(state)}`,
      );
    }
  });

  test("categories index and category detail work", async ({ page }) => {
    await page.goto("/categories");
    await expect(page.getByRole("link", { name: /Utilities/ }).first()).toBeVisible();

    await page.goto("/categories/utilities");
    await expect(page.getByRole("link", { name: /LocalSend/ }).first()).toBeVisible();
  });

  test("developers index and developer detail work", async ({ page }) => {
    await page.goto("/developers");
    await expect(page.getByText(/LocalSend Team|KeePassXC Team/i).first()).toBeVisible();

    await page.goto("/developers/localsend-org");
    await expect(page.getByRole("link", { name: /LocalSend/ }).first()).toBeVisible();
  });
});
