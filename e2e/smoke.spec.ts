import { test, expect } from "@playwright/test";

test("home and search", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Discover Open-Source Apps" })).toBeVisible();
  await page.goto("/search?q=music");
  await expect(page.getByText(/results/)).toBeVisible();
});
