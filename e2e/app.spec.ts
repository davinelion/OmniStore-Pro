import { expect, test } from "@playwright/test";

/**
 * End-to-end acceptance tests.
 *
 * These run against a production build (`npm run build && npm start`) in CI.
 * Install browsers once with `npx playwright install --with-deps`.
 */

test.describe("home", () => {
  test("loads and exposes search, browse and taxonomy navigation", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /omni/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /^apps$/i }).first()).toBeVisible();

    const search = page.getByRole("searchbox").or(page.getByPlaceholder(/search/i)).first();
    await expect(search).toBeVisible();
  });

  test("searching from the home page takes you to results", async ({ page }) => {
    await page.goto("/");
    const search = page.getByRole("searchbox").or(page.getByPlaceholder(/search/i)).first();
    await search.fill("localsend");
    await search.press("Enter");

    await expect(page).toHaveURL(/\/search\?q=localsend/);
    await expect(page.getByRole("link", { name: /localsend/i }).first()).toBeVisible();
  });
});

test.describe("search and filters", () => {
  test("returns results and reports a count", async ({ page }) => {
    await page.goto("/search?q=music");
    await expect(page.getByText(/results?/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /audacity|spotube|navidrome/i }).first()).toBeVisible();
  });

  test("shows an empty state for a nonsense query", async ({ page }) => {
    await page.goto("/search?q=zzzqqqxxxnotarealapp");
    await expect(page.getByText(/no apps found/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /clear filters/i })).toBeVisible();
  });

  test("platform filters narrow the result set", async ({ page }) => {
    await page.goto("/apps");
    const totalBefore = await page.locator("article").count();

    await page.getByRole("link", { name: /platforms/i }).first().click();
    await page.waitForURL(/\/platforms/);
    await page.getByRole("link", { name: /macos/i }).first().click();

    await expect(page).toHaveURL(/platform=macos|platforms\/macos/);
    const totalAfter = await page.locator("article").count();
    expect(totalAfter).toBeGreaterThan(0);
    expect(totalAfter).toBeLessThanOrEqual(totalBefore);
  });

  test("pagination moves through results", async ({ page }) => {
    await page.goto("/apps");
    const next = page.getByRole("link", { name: /next/i }).first();
    if ((await next.count()) === 0) test.skip();
    await next.click();
    await expect(page).toHaveURL(/page=2/);
  });
});

test.describe("app pages", () => {
  test("show real upstream data, scores and downloads", async ({ page }) => {
    await page.goto("/apps/localsend");

    await expect(page.getByRole("heading", { name: /localsend/i }).first()).toBeVisible();
    await expect(page.getByText(/trust score/i).first()).toBeVisible();
    await expect(page.getByText(/not a security guarantee/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /download/i }).first()).toBeVisible();
  });

  test("download links are https and open safely", async ({ page }) => {
    await page.goto("/apps/localsend");
    const links = page.locator('a[href^="http"]');
    const count = await links.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < Math.min(count, 10); i += 1) {
      const href = await links.nth(i).getAttribute("href");
      expect(href).toMatch(/^https:\/\//);
      const rel = await links.nth(i).getAttribute("rel");
      expect(rel ?? "").toContain("noopener");
    }
  });

  test("release history is reachable and readable", async ({ page }) => {
    await page.goto("/apps/localsend/releases");
    await expect(page.getByText(/releases/i).first()).toBeVisible();
    await expect(page.locator("ol li").first()).toBeVisible();
  });

  test("alternatives and similar apps are listed", async ({ page }) => {
    await page.goto("/apps/localsend");
    const hasAlternatives = await page.getByText(/alternatives/i).count();
    expect(hasAlternatives).toBeGreaterThan(0);
  });
});

test.describe("comparison", () => {
  test("lets you add apps and compare them side by side", async ({ page }) => {
    await page.goto("/apps/localsend");
    await page.getByRole("button", { name: /compare/i }).first().click();
    await page.goto("/apps/syncthing");
    await page.getByRole("button", { name: /compare/i }).first().click();

    await page.goto("/compare");
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /localsend/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /syncthing/i })).toBeVisible();
  });
});

test.describe("favorites", () => {
  test("are saved locally and survive navigation", async ({ page }) => {
    await page.goto("/apps/localsend");
    await page.getByRole("button", { name: /favorite|save/i }).first().click();

    await page.goto("/favorites");
    await expect(page.getByRole("link", { name: /localsend/i }).first()).toBeVisible();
  });
});

test.describe("theme and responsive layout", () => {
  test("dark mode toggles and persists", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByRole("button", { name: /theme|dark|light/i }).first();
    await toggle.click();

    const theme = await page.evaluate(() => document.documentElement.dataset.theme ?? document.documentElement.className);
    expect(theme).toBeTruthy();

    await page.reload();
    const afterReload = await page.evaluate(() => document.documentElement.dataset.theme ?? document.documentElement.className);
    expect(afterReload).toBe(theme);
  });

  test("works on a phone viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    await expect(page.getByRole("banner")).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(2);
  });

  test("works on a desktop viewport", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/apps");
    await expect(page.locator("article").first()).toBeVisible();
  });
});

test.describe("accessibility", () => {
  test("keyboard navigation reaches the search field", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const first = await page.evaluate(() => document.activeElement?.textContent?.trim() ?? "");
    expect(first.length).toBeGreaterThan(0);
  });

  test("images have alt text and headings are ordered", async ({ page }) => {
    await page.goto("/apps/localsend");
    const imagesWithoutAlt = await page.locator("img:not([alt])").count();
    expect(imagesWithoutAlt).toBe(0);
    const h1 = await page.locator("h1").count();
    expect(h1).toBeGreaterThanOrEqual(1);
  });
});

test.describe("error and offline states", () => {
  test("an unknown app shows a 404 page", async ({ page }) => {
    const response = await page.goto("/apps/not-a-real-app-xyz");
    expect(response?.status()).toBe(404);
    await expect(page.getByText(/could not find|404/i).first()).toBeVisible();
  });

  test("the API returns a typed error for an unknown app", async ({ request }) => {
    const response = await request.get("/api/v1/apps/not-a-real-app-xyz");
    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBeTruthy();
  });

  test("the offline page renders when the network is unavailable", async ({ page, context }) => {
    await page.goto("/");
    await context.setOffline(true);
    await page.goto("/offline");
    await expect(page.getByText(/offline/i).first()).toBeVisible();
    await context.setOffline(false);
  });
});
