import { expect, test } from "@playwright/test";

/**
 * Core smoke tests — the storefront renders live OmniSource data end to end.
 */
test.describe("smoke", () => {
  test("homepage renders hero, catalog sections and stats", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { level: 1, name: /Every open-source app/i }),
    ).toBeVisible();

    // Live catalog data from the (mock) OmniSource engine.
    await expect(page.getByRole("link", { name: /LocalSend/ }).first()).toBeVisible();

    // Stats section reflects the catalog.
    await expect(page.getByText("Powered by OmniSource").first()).toBeVisible();
  });

  test("OmniStore API v1 proxy serves the catalog contract", async ({ request }) => {
    const stats = await request.get("/api/v1/stats");
    expect(stats.ok()).toBeTruthy();
    const statsBody = await stats.json();
    expect(statsBody.applications).toBeGreaterThan(0);

    const apps = await request.get("/api/v1/apps?per_page=5");
    expect(apps.ok()).toBeTruthy();
    const appsBody = await apps.json();
    expect(appsBody.total).toBeGreaterThan(0);
    expect(appsBody.items[0]).toHaveProperty("slug");

    const detail = await request.get("/api/v1/apps/localsend");
    expect(detail.ok()).toBeTruthy();
    expect((await detail.json()).name).toBe("LocalSend");

    const trust = await request.get("/api/v1/trust/localsend");
    expect(trust.ok()).toBeTruthy();
    expect((await trust.json()).score).toBeGreaterThan(0);
  });

  test("unknown app returns the 404 page", async ({ page }) => {
    const response = await page.goto("/app/this-app-does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.getByText(/does not exist|Not found/i).first()).toBeVisible();
  });

  test("PWA essentials are served", async ({ request }) => {
    const manifest = await request.get("/manifest.webmanifest");
    expect(manifest.ok()).toBeTruthy();
    expect(await manifest.json()).toHaveProperty("icons");

    const robots = await request.get("/robots.txt");
    expect(robots.ok()).toBeTruthy();

    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.ok()).toBeTruthy();
  });
});
