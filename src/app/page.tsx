import { getTranslations } from "next-intl/server";
import Link from "next/link";

import type { App, Category, Collection, Developer, PlatformInfo } from "@omnistore/shared-models";
import { getOmnisource } from "@/lib/omnisource";
import { fetchBadges } from "@/lib/omnisource/badges";
import { HeroBanner } from "@/components/home/HeroBanner";
import { CtaBand } from "@/components/home/CtaBand";
import { FeaturesGrid } from "@/components/home/FeaturesGrid";
import { CollectionSection } from "@/components/collection/CollectionSection";
import { sectionSlug } from "@/lib/section";
import { CategoryCard } from "@/components/category/CategoryCard";
import { DeveloperCard } from "@/components/developer/DeveloperCard";
import { PlatformShowcase } from "@/components/store/PlatformTabs";
import { StoreAppGrid } from "@/components/store/StoreAppCard";
import { AIAssistant } from "@/components/store/AIAssistant";
import { CrossPlatformBanner, AutomationBanner } from "@/components/store/CrossPlatformBanner";
import { AllPlatformsShowcase, CrossPlatformHighlights } from "@/components/store/PlatformStoreSection";
import { Layers, Sparkles, TrendingUp, Download, Github, ArrowRight, Monitor, Apple, Terminal, Smartphone } from "lucide-react";

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
  platforms: PlatformInfo[];
  allApps: App[];
};

async function loadHome(): Promise<HomeData> {
  const client = getOmnisource();
  const [stats, featured, trending, recent, newest, popular, recommended, categories, developers, platforms, allApps] =
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
      client.getPlatforms(),
      client.getApps({ perPage: 100, sort: "popularity" as any }),
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
    platforms: platforms.status === "fulfilled" ? platforms.value : [],
    allApps: allApps.status === "fulfilled" ? allApps.value.items : [],
  };
}

export default async function HomePage() {
  const [t, data] = await Promise.all([getTranslations("home"), loadHome()]);

  const badgeIds = [
    ...(data.featured?.apps ?? []).slice(0, 6).map((app) => app.id),
    ...data.trending.slice(0, 4).map((app) => app.id),
  ];
  const badges = await fetchBadges(badgeIds);

  // Platform-specific slices for store-like experience
  const windowsApps = data.allApps.filter(a => (a.platforms ?? []).includes("windows" as any));
  const macosApps = data.allApps.filter(a => (a.platforms ?? []).includes("macos" as any));
  const linuxApps = data.allApps.filter(a => (a.platforms ?? []).includes("linux" as any));
  const androidApps = data.allApps.filter(a => (a.platforms ?? []).includes("android" as any));

  return (
    <div className="space-y-14 sm:space-y-16">
      <HeroBanner
        stats={
          data.stats
            ? {
                apps: data.stats.apps,
                releases: data.stats.releases,
                platforms: data.stats.platforms,
                repositories: data.stats.repositories,
              }
            : null
        }
        marqueeApps={data.trending.map((app) => ({
          id: app.id,
          slug: app.slug,
          name: app.name,
          icon: app.icon,
          shortDescription: app.shortDescription,
        }))}
        marqueeLabel={t("trending")}
      />

      <AutomationBanner />

      {/* World-class store header */}
      <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 font-display text-xl font-bold tracking-tight sm:text-2xl">
              <Layers className="h-6 w-6 text-accent" />
              The Largest Open-Source App Store
              <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent">444 Apps • 13k Assets</span>
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-muted sm:text-[15px] leading-relaxed">
              Like <strong>App Store</strong>, <strong>Play Store</strong> and <strong>F-Droid</strong> — but for every platform. 
              Direct downloads from upstream GitHub releases, source code always visible, AI-powered discovery, fully automated daily ingest from OmniSource.
              No accounts, no tracking, no vendor lock-in.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/apps" className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors">
              <Download className="h-4 w-4" />
              Browse All {data.stats?.apps ?? 444} Apps
            </Link>
            <Link href="/platforms" className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-2/50 px-5 py-2.5 text-sm font-semibold hover:border-accent/40 transition-colors">
              <Layers className="h-4 w-4" />
              Platforms
            </Link>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-line bg-surface-2/30 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold"><Download className="h-3.5 w-3.5 text-accent" /> Direct Download</p>
            <p className="mt-1 text-2xs text-muted">From upstream GitHub, no mirrors. VALID assets only, size & checksum shown.</p>
          </div>
          <div className="rounded-xl border border-line bg-surface-2/30 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold"><Github className="h-3.5 w-3.5 text-accent" /> Source Link</p>
            <p className="mt-1 text-2xs text-muted">Every card shows source repo + homepage. Audit code before install.</p>
          </div>
          <div className="rounded-xl border border-line bg-surface-2/30 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold"><Sparkles className="h-3.5 w-3.5 text-accent" /> AI Discovery</p>
            <p className="mt-1 text-2xs text-muted">Natural language search, smart categories, cross-platform recommendations.</p>
          </div>
          <div className="rounded-xl border border-line bg-surface-2/30 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold"><TrendingUp className="h-3.5 w-3.5 text-accent" /> Cross-Platform</p>
            <p className="mt-1 text-2xs text-muted">Seamless: Windows, macOS, Linux, Android, iOS in one store.</p>
          </div>
        </div>
      </div>

      <PlatformShowcase platforms={data.platforms} />

      <CrossPlatformBanner />

      {/* Obtainium-style Direct Updates Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-accent/30 bg-gradient-to-br from-surface via-surface to-accent-soft/40 p-6 sm:p-8">
        <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-accent-2/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent-soft px-3 py-1 text-xs font-bold text-accent">
              <Download className="h-3.5 w-3.5" />
              New: Obtainium-Style Direct Updates
            </div>
            <h2 className="mt-3 font-display text-xl font-bold tracking-tight sm:text-2xl">
              Get App Updates <span className="text-gradient-brand">Directly From Source</span>
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Like Obtainium for Android — but for every platform. Track any app from GitHub, GitLab, F-Droid. OmniStore checks directly for new releases, notifies you, and lets you download APK/EXE/DMG straight from source. No store middleman, no tracking.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-2/50 px-3 py-2">
                <Download className="h-4 w-4 text-accent" />
                <span className="text-xs font-medium">Direct APK/EXE from GitHub</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-2/50 px-3 py-2">
                <Sparkles className="h-4 w-4 text-accent" />
                <span className="text-xs font-medium">Background checks every 6h</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-2/50 px-3 py-2">
                <Github className="h-4 w-4 text-accent" />
                <span className="text-xs font-medium">Skip, rollback, track-only</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Link href="/updates" className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-bold text-white shadow-glow hover:bg-accent-hover hover:-translate-y-0.5 transition-all">
              <Download className="h-4 w-4" />
              Open Updates Center
            </Link>
            <Link href="/track" className="inline-flex items-center justify-center gap-2 rounded-full border border-line bg-surface px-6 py-3 text-sm font-semibold hover:border-accent/40 transition-colors">
              <Layers className="h-4 w-4" />
              Track a source
            </Link>
            <p className="text-center text-2xs text-muted">444 apps • 13k assets • Import/export • Auto-update</p>
          </div>
        </div>
      </div>

      <AIAssistant apps={data.allApps} />

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
        layout="ranked"
        badgesByAppId={badges}
        moreHref="/apps?sort=popularity"
        moreLabel={t("viewAll")}
      />

      {/* Platform Stores - App Store / Play Store like */}
      <section className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-display text-xl font-bold tracking-tight sm:text-2xl">
              <Monitor className="h-6 w-6 text-accent" />
              Windows Store
              <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-600">{windowsApps.length} apps • EXE, MSI, MSIX</span>
            </h2>
            <p className="mt-1 text-sm text-muted">Like Microsoft Store, but open source — direct EXE/MSI downloads with source links</p>
          </div>
          <Link href="/platforms/windows" className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">
            View all Windows apps <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <StoreAppGrid apps={windowsApps.slice(0, 8)} preferredPlatform={"windows" as any} />
      </section>

      <section className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-display text-xl font-bold tracking-tight sm:text-2xl">
              <Apple className="h-6 w-6 text-accent" />
              macOS Store
              <span className="rounded-full bg-zinc-500/10 px-2.5 py-0.5 text-xs font-medium text-zinc-600">{macosApps.length} apps • DMG, PKG</span>
            </h2>
            <p className="mt-1 text-sm text-muted">Like Mac App Store, but open & direct — signed DMGs for Intel & Apple Silicon</p>
          </div>
          <Link href="/platforms/macos" className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">
            View all macOS apps <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <StoreAppGrid apps={macosApps.slice(0, 8)} preferredPlatform={"macos" as any} />
      </section>

      <section className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-display text-xl font-bold tracking-tight sm:text-2xl">
              <Terminal className="h-6 w-6 text-accent" />
              Linux Store
              <span className="rounded-full bg-orange-500/10 px-2.5 py-0.5 text-xs font-medium text-orange-600">{linuxApps.length} apps • AppImage, Flatpak, DEB, RPM</span>
            </h2>
            <p className="mt-1 text-sm text-muted">Like Flathub + Snap Store combined — AppImage, Flatpak, DEB, RPM, Snap in one place</p>
          </div>
          <Link href="/platforms/linux" className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">
            View all Linux apps <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <StoreAppGrid apps={linuxApps.slice(0, 8)} preferredPlatform={"linux" as any} />
      </section>

      <section className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-display text-xl font-bold tracking-tight sm:text-2xl">
              <Smartphone className="h-6 w-6 text-accent" />
              Android Store
              <span className="rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-600">{androidApps.length} apps • APK direct</span>
            </h2>
            <p className="mt-1 text-sm text-muted">Like F-Droid & Play Store — direct APKs, no Google account, source verified</p>
          </div>
          <Link href="/platforms/android" className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">
            View all Android apps <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <StoreAppGrid apps={androidApps.slice(0, 8)} preferredPlatform={"android" as any} />
      </section>

      <CrossPlatformHighlights apps={data.allApps} />

      <FeaturesGrid />

      {data.categories.length > 0 ? (
        <section aria-labelledby={sectionSlug(t("categories"))} className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2
                id={sectionSlug(t("categories"))}
                className="font-display text-xl font-semibold tracking-tight sm:text-2xl"
              >
                {t("categories")}
              </h2>
              <p className="mt-1 text-sm text-muted">{t("categoriesDescription")} • Every category has platform filters</p>
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

      {/* All apps - largest store showcase */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-display text-xl font-bold tracking-tight sm:text-2xl">
              <Layers className="h-6 w-6 text-accent" />
              All Apps — The Full Catalog
              <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent">{data.allApps.length} apps shown, {data.stats?.apps ?? 444} total</span>
            </h2>
            <p className="mt-1 text-sm text-muted">Every app with direct download + source link • Cross-platform cards • AI-ranked</p>
          </div>
          <Link href="/apps" className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover">
            Browse Full Store
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <StoreAppGrid apps={data.allApps.slice(0, 24)} />
        <div className="text-center pt-2">
          <Link href="/apps" className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-6 py-3 text-sm font-semibold hover:border-accent/40 transition-colors">
            View all {data.stats?.apps ?? 444} apps with platform filters
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <CollectionSection
        title={t("popular")}
        description={t("popularDescription")}
        apps={data.popular}
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

      {data.recommended.length > 0 ? (
        <CollectionSection
          title={t("recommended")}
          description={t("recommendedDescription")}
          apps={data.recommended}
          layout="compact"
        />
      ) : null}

      {data.developers.length > 0 ? (
        <section aria-labelledby={sectionSlug(t("topDevelopers"))} className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2
                id={sectionSlug(t("topDevelopers"))}
                className="font-display text-xl font-semibold tracking-tight sm:text-2xl"
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

      <CtaBand />
    </div>
  );
}
