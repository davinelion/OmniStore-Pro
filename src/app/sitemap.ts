import type { MetadataRoute } from "next";

import { getOmnisource } from "@/lib/omnisource";
import { absoluteUrl } from "@/config/site";

export const revalidate = 3600;

/** Dynamic sitemap: static routes + every app/collection/category/developer. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const client = getOmnisource();

  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/apps",
    "/search",
    "/collections",
    "/categories",
    "/developers",
    "/about",
    "/privacy",
    "/terms",
  ].map((path) => ({
    url: absoluteUrl(path),
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.6,
  }));

  const [apps, collections, categories, developers] = await Promise.allSettled([
    client.getApps({ perPage: 100 }),
    client.getCollections(1, 100),
    client.getCategories(),
    client.getDevelopers(200),
  ]);

  if (apps.status === "fulfilled") {
    for (const app of apps.value.items) {
      staticRoutes.push({
        url: absoluteUrl(`/app/${app.slug}`),
        changeFrequency: "daily",
        priority: 0.8,
      });
    }
  }
  if (collections.status === "fulfilled") {
    for (const collection of collections.value.items) {
      staticRoutes.push({
        url: absoluteUrl(`/collection/${collection.slug}`),
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  }
  if (categories.status === "fulfilled") {
    for (const category of categories.value) {
      staticRoutes.push({
        url: absoluteUrl(`/categories/${category.slug}`),
        changeFrequency: "weekly",
        priority: 0.5,
      });
    }
  }
  if (developers.status === "fulfilled") {
    for (const developer of developers.value) {
      staticRoutes.push({
        url: absoluteUrl(`/developers/${developer.slug}`),
        changeFrequency: "weekly",
        priority: 0.4,
      });
    }
  }

  return staticRoutes;
}
