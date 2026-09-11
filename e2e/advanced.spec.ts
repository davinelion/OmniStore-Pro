import { expect, test } from "@playwright/test";

/**
 * Advanced flows: user collections with share-link import, offline fallback
 * and i18n rendering.
 */
test.describe("user collections", () => {
  test("creates a collection, persists it and shares it via link", async ({ page }) => {
    await page.goto("/collections/mine");

    // Create a collection (local-first storage).
    await page.getByRole("button", { name: /new collection/i }).first().click();
    await page.getByPlaceholder("Collection name").fill("My toolkit");
    await page.getByPlaceholder("Collection name").press("Enter");

    await expect(page.getByText("My toolkit").first()).toBeVisible();

    // Persisted across reloads (IndexedDB).
    await page.reload();
    await expect(page.getByText("My toolkit").first()).toBeVisible();
  });

  test("import link restores a shared collection", async ({ page }) => {
    // Payload produced by encodeShare({name:"Shared pack", description:"", appIds:["localsend"]}).
    const payload = Buffer.from(
      JSON.stringify({ name: "Shared pack", description: "", appIds: ["localsend"] }),
    ).toString("base64url");

    await page.goto(`/collections/mine?import=${payload}`);
    await expect(page.getByText("Shared pack").first()).toBeVisible();
  });
});

test.describe("platform basics", () => {
  test("offline fallback route renders", async ({ page }) => {
    await page.goto("/offline");
    await expect(page.getByText(/offline/i).first()).toBeVisible();
  });

  test("locale switcher re-renders UI strings", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: /Every open-source app/i })).toBeVisible();
  });

  test("static pages render", async ({ page }) => {
    for (const path of ["/about", "/privacy", "/terms"]) {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
  });
});
