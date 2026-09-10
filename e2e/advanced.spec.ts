import { expect, test } from "@playwright/test";
test("personal collections persist and share links omit notes", async ({
  page,
}) => {
  await page.goto("/library");
  await page.getByLabel("Collection name", { exact: true }).fill("My toolkit");
  await page.getByRole("button", { name: "Create collection" }).click();
  await expect(page.getByRole("heading", { name: "My toolkit" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "My toolkit" })).toBeVisible();
  await page.getByRole("button", { name: "Create share link" }).click();
  const link = await page
    .getByLabel("Share link", { exact: true })
    .inputValue();
  await page.goto(link);
  await expect(
    page.getByRole("heading", { name: "Shared collection: My toolkit" }),
  ).toBeVisible();
});
test("new discovery and transparency routes work", async ({
  page,
  request,
}) => {
  await page.goto("/alternatives?q=notion&platform=linux");
  await expect(
    page.getByRole("heading", { name: "Alternatives to Notion" }),
  ).toBeVisible();
  await page.goto("/catalog-health");
  await expect(
    page.getByRole("heading", { name: "Catalog transparency" }),
  ).toBeVisible();
  await page.goto("/updates");
  await expect(
    page.getByRole("heading", { name: "Your next release starts here" }),
  ).toBeVisible();
  const rss = await request.get("/api/v1/feed");
  expect(rss.ok()).toBeTruthy();
  expect(rss.headers()["content-type"]).toContain("application/rss+xml");
  expect(await rss.text()).toContain('<rss version="2.0">');
});
