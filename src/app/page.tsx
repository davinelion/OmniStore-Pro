import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Sparkles } from "lucide-react";

import type { App, Category, Collection, Developer } from "@omnistore/shared-models";
import { getOmnisource } from "@/lib/omnisource";
import { fetchBadges } from "@/lib/omnisource/badges";
import { HeroBanner } from "@/components/home/HeroBanner";
import { CollectionSection } from "@/components/collection/CollectionSection";
import { sectionSlug } from "@/lib/section";
import { CategoryCard } from "@/components/category/CategoryCard";
import { DeveloperCard } from "@/components/developer/DeveloperCard";
import { StatsCard } from "@/components/stats/StatsCard";
import { formatCompactNumber } from "@/lib/formatters";

/**
 * Homepage — fully API-driven. Every section is a live OmniSource read;
 * there is no hardcoded content, no fallback feed. Sections degrade
 * independently: if one read fails the rest of the page still renders.
 */
export const revalidate = 300;

type HomeData = {
  stats: {
    apps: number;
    platforms: number;
    releases: number;
    assets: number;
    repositories: number;
    downloads: number | null;
  } | null;
  featured: Collection | null;
  trending: App[];
  recent: App[];
  newest: App[];
  popular: App[];
  recommended: App[];
  categories: Category[];
  developers: Developer[];
};

async function loadHome(): Promise<HomeData> {
  const client = getOmnisource();
  const [stats, featured, trending, recent, newest, popular, recommended, categories, developers] =
    await Promise.allSettled([
      client.getStats(),
      client.getFeatured(),
      client.getTrending(),
      client.getRecent(),
      client.recommendationsApi.discover({ sort: "new", limit: 12 }),
      client.getPopular(12),
      client.recommendationsApi.trending(8),
      client.getCategories(),
      client.getDevelopers(8),
    ]);

  return {
    stats: stats.status === "fulfilled" ? stats.value : null,
    featured: featured.status === "fulfilled" ? featured.value : null,
    trending: trending.status === "fulfilled" ? trending.value : [],
    recent: recent.status === "fulfilled" ? recent.value : [],
    newest: newest.status === "fulfilled" ? newest.value : [],
    popular: popular.status === "fulfilled" ? popular.value.items : [],
    recommended: recommended.status === "fulfilled" ? recommended.value : [],
    categories: categories.status === "fulfilled" ? categories.value : [],
    developers: developers.status === "fulfilled" ? developers.value : [],
  };
}

export default async function HomePage() {
  const [t, tStats, data] = await Promise.all([getTranslations("home"), getTranslations("stats"), loadHome()]);

  // Real badges for the small number of hero/featured cards; other cards show
  // the embedded trust score, which ships with every app payload.
  const badgeIds = [
    ...(data.featured?.apps ?? []).slice(0, 6).map((app) => app.id),
    ...data.trending.slice(0, 4).map((app) => app.id),
  ];
  const badges = await fetchBadges(badgeIds);

  const totalDownloads =
    data.stats?.downloads != null ? formatCompactNumber(data.stats.downloads) : null;

  return (
    <div className="space-y-10">
      <HeroBanner
        stats={data.stats ? { apps: data.stats.apps, platforms: data.stats.platforms } : null}
      />

      <CollectionSection
        title={data.featured?.name ?? t("featured")}
        description={data.featured?.description ?? t("featuredDescription")}
        apps={data.featured?.apps ?? []}
        layout="hero"
        badgesByAppId={badges}
        moreHref={data.featured ? `/collection/${data.featured.slug}` : "/collections"}
        moreLabel={t("viewAll")}
      />

      <CollectionSection
        title={t("trending")}
        description={t("trendingDescription")}
        apps={data.trending}
        layout="carousel"
        badgesByAppId={badges}
        moreHref="/apps?sort=popularity"
        moreLabel={t("viewAll")}
      />

      <CollectionSection
        title={t("recent")}
        description={t("recentDescription")}
        apps={data.recent}
        layout="carousel"
        moreHref="/apps?sort=updated"
        moreLabel={t("viewAll")}
      />

      <CollectionSection
        title={t("newReleases")}
        description={t("newReleasesDescription")}
        apps={data.newest}
        layout="carousel"
        moreHref="/apps?sort=newest"
        moreLabel={t("viewAll")}
      />

      <CollectionSection
        title={t("popular")}
        description={t("popularDescription")}
        apps={data.popular}
        layout="carousel"
        moreHref="/apps?sort=popularity"
        moreLabel={t("viewAll")}
      />

      {data.recommended.length > 0 ? (
        <CollectionSection
          title={t("recommended")}
          description={t("recommendedDescription")}
          apps={data.recommended}
          layout="compact"
          icon={<Sparkles className="h-5 w-5 text-accent" aria-hidden />}
        />
      ) : null}

      {data.developers.length > 0 ? (
        <section aria-labelledby={sectionSlug(t("topDevelopers"))} className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2
                id={sectionSlug(t("topDevelopers"))}
                className="text-xl font-semibold tracking-tight sm:text-2xl"
              >
                {t("topDevelopers")}
              </h2>
              <p className="mt-1 text-sm text-muted">{t("topDevelopersDescription")}</p>
            </div>
            <Link href="/developers" className="text-sm font-medium text-accent hover:underline">
              {t("viewAll")}
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {data.developers.map((developer) => (
              <DeveloperCard key={developer.id} developer={developer} />
            ))}
          </div>
        </section>
      ) : null}

      {data.categories.length > 0 ? (
        <section aria-labelledby={sectionSlug(t("categories"))} className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2
                id={sectionSlug(t("categories"))}
                className="text-xl font-semibold tracking-tight sm:text-2xl"
              >
                {t("categories")}
              </h2>
              <p className="mt-1 text-sm text-muted">{t("categoriesDescription")}</p>
            </div>
            <Link href="/categories" className="text-sm font-medium text-accent hover:underline">
              {t("viewAll")}
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {data.categories.slice(0, 12).map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        </section>
      ) : null}

      {data.stats ? (
        <section aria-labelledby={sectionSlug(t("stats"))} className="space-y-4">
          <h2 id={sectionSlug(t("stats"))} className="text-xl font-semibold tracking-tight sm:text-2xl">
            {t("stats")}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatsCard label={tStats("apps")} value={data.stats.apps.toLocaleString()} />
            <StatsCard label={tStats("releases")} value={data.stats.releases.toLocaleString()} />
            <StatsCard label={tStats("assets")} value={data.stats.assets.toLocaleString()} />
            <StatsCard
              label={tStats("repositories")}
              value={data.stats.repositories.toLocaleString()}
            />
            <StatsCard label={tStats("platforms")} value={String(data.stats.platforms)} />
            {totalDownloads ? (
              <StatsCard label={tStats("downloads")} value={totalDownloads} />
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
