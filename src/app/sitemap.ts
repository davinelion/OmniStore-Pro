import type { MetadataRoute } from "next";

import { getProvider } from "@/lib/api";
import { DEFAULT_FILTERS } from "@/lib/search/query";
import { absoluteUrl } from "@/config/site";

export const dynamic = "force-dynamic";

/**
 * Sitemap generated from live OmniSource data.
 *
 * App and taxonomy pages are indexable; personal and query-driven pages
 * (search, compare, favorites) are excluded.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const provider = getProvider();
  const [apps, categories, platforms, collections, developers] = await Promise.all([
    provider.getApps({ ...DEFAULT_FILTERS, perPage: 500, sort: "name" }),
    provider.getCategories(),
    provider.getPlatforms(),
    provider.getCollections(),
    provider.getDevelopers(),
  ]);

  const freshness = (await provider.getFeedMeta()).generated_at;
  const lastModified = new Date(freshness);
  const safeModified = Number.isNaN(lastModified.getTime()) ? new Date() : lastModified;

  return [
    { url: absoluteUrl("/"), lastModified: safeModified, changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/apps"), lastModified: safeModified, changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/categories"), lastModified: safeModified, changeFrequency: "weekly", priority: 0.8 },
    { url: absoluteUrl("/platforms"), lastModified: safeModified, changeFrequency: "weekly", priority: 0.8 },
    { url: absoluteUrl("/collections"), lastModified: safeModified, changeFrequency: "weekly", priority: 0.7 },
    { url: absoluteUrl("/trending"), lastModified: safeModified, changeFrequency: "daily", priority: 0.7 },
    { url: absoluteUrl("/latest"), lastModified: safeModified, changeFrequency: "daily", priority: 0.7 },
    {
      url: absoluteUrl("/discover/cross-platform"),
      lastModified: safeModified,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    { url: absoluteUrl("/developers"), lastModified: safeModified, changeFrequency: "weekly", priority: 0.6 },
    { url: absoluteUrl("/docs"), lastModified: safeModified, changeFrequency: "monthly", priority: 0.6 },
    { url: absoluteUrl("/about"), lastModified: safeModified, changeFrequency: "monthly", priority: 0.6 },
    { url: absoluteUrl("/privacy"), lastModified: safeModified, changeFrequency: "yearly", priority: 0.3 },
    { url: absoluteUrl("/terms"), lastModified: safeModified, changeFrequency: "yearly", priority: 0.3 },

    ...apps.items.map((app) => ({
      url: absoluteUrl(`/apps/${app.slug}`),
      lastModified: app.updated_at ? new Date(app.updated_at) : safeModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...apps.items.map((app) => ({
      url: absoluteUrl(`/apps/${app.slug}/releases`),
      lastModified: app.latest_release?.released_at ? new Date(app.latest_release.released_at) : safeModified,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
    ...categories
      .filter((category) => category.app_count > 0)
      .map((category) => ({
        url: absoluteUrl(`/categories/${category.slug}`),
        lastModified: safeModified,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
    ...platforms
      .filter((platform) => platform.app_count > 0)
      .map((platform) => ({
        url: absoluteUrl(`/platforms/${platform.slug}`),
        lastModified: safeModified,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
    ...collections.map((collection) => ({
      url: absoluteUrl(`/collections/${collection.slug}`),
      lastModified: safeModified,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...developers.map((developer) => ({
      url: absoluteUrl(`/developers/${developer.slug}`),
      lastModified: safeModified,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
