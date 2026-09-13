import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Monitor, Laptop, Terminal, Smartphone, Apple, ArrowLeft, Download, Github, Layers } from "lucide-react";

import { getOmnisource } from "@/lib/omnisource";
import { orFallback, orEmpty } from "@/lib/omnisource/with-fallback";
import { StoreAppGrid, StoreAppCard } from "@/components/store/StoreAppCard";
import { PlatformTabs } from "@/components/store/PlatformTabs";
import { cn } from "@/lib/utils";
import type { Platform } from "@omnistore/shared-models";

export const revalidate = 300;

const PLATFORM_META: Record<string, { name: string; description: string; longDescription: string; color: string; icon: typeof Monitor; packageTypes: string[]; storeLike: string }> = {
  windows: {
    name: "Windows",
    description: "EXE, MSI, MSIX & portable apps",
    longDescription: "Windows Store alternative — native installers directly from GitHub. No Microsoft Store account needed. Every app is open source with source link.",
    color: "from-blue-600 to-cyan-500",
    icon: Monitor,
    packageTypes: ["exe", "msi", "msix", "appx", "zip"],
    storeLike: "Like Microsoft Store, but open source",
  },
  macos: {
    name: "macOS",
    description: "DMG, PKG & universal binaries",
    longDescription: "Mac App Store alternative — signed DMGs for Intel & Apple Silicon. Direct downloads, no Apple ID. Source always visible.",
    color: "from-zinc-700 to-slate-600",
    icon: Laptop,
    packageTypes: ["dmg", "pkg", "zip"],
    storeLike: "Like Mac App Store, but open & direct",
  },
  linux: {
    name: "Linux",
    description: "AppImage, Flatpak, DEB, RPM, Snap",
    longDescription: "The Linux app store you've been waiting for — AppImage, Flatpak, DEB, RPM, Snap in one place. Like Flathub + Snap Store combined.",
    color: "from-orange-600 to-amber-500",
    icon: Terminal,
    packageTypes: ["appimage", "flatpak", "deb", "rpm", "snap"],
    storeLike: "Like Flathub, Snap Store & AppImageHub combined",
  },
  android: {
    name: "Android",
    description: "APK & AAB direct installs",
    longDescription: "F-Droid + Play Store alternative — direct APKs, no Google account. Open source Android apps with source verification.",
    color: "from-green-600 to-emerald-500",
    icon: Smartphone,
    packageTypes: ["apk", "aab"],
    storeLike: "Like F-Droid & Play Store, but direct",
  },
  ios: {
    name: "iOS",
    description: "IPA & TestFlight builds",
    longDescription: "iOS App Store alternative for open source — IPA sideloads and TestFlight links. Source code always linked.",
    color: "from-slate-700 to-zinc-600",
    icon: Apple,
    packageTypes: ["ipa"],
    storeLike: "Like App Store, but open source",
  },
  ipados: {
    name: "iPadOS",
    description: "iPad optimized apps",
    longDescription: "iPadOS apps with Apple Pencil and multitasking support. Open source iPad apps.",
    color: "from-purple-600 to-violet-500",
    icon: Apple,
    packageTypes: ["ipa"],
    storeLike: "Like App Store for iPad",
  },
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const meta = PLATFORM_META[slug];
  if (!meta) return { title: "Platform not found" };
  return {
    title: `${meta.name} Apps - OmniStore`,
    description: `${meta.longDescription} ${meta.packageTypes.join(", ")} direct downloads.`,
    alternates: { canonical: `/platforms/${slug}` },
  };
}

export default async function PlatformPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ category?: string; sort?: string; page?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const meta = PLATFORM_META[slug];
  if (!meta) notFound();

  const client = getOmnisource();
  const [platforms, categories, appsResult] = await Promise.all([
    orEmpty(client.getPlatforms(), `platforms for ${slug}`),
    orEmpty(client.getCategories(), `categories for ${slug}`),
    orFallback(
      client.getApps({
        platform: slug as any,
        category: query.category,
        sort: (query.sort as any) ?? "popularity",
        perPage: 48,
        page: query.page ? parseInt(query.page, 10) : 1,
      }),
      { items: [], pagination: { page: 1, perPage: 48, total: 0, totalPages: 0 }, freshness: null },
      `apps for platform ${slug}`
    ),
  ]);

  const apps = appsResult.items;
  const Icon = meta.icon;

  // Group by category for this platform
  const byCategory = new Map<string, typeof apps>();
  for (const app of apps) {
    for (const cat of app.categories ?? []) {
      const list = byCategory.get(cat) ?? [];
      list.push(app);
      byCategory.set(cat, list);
    }
  }

  const sortedCategories = Array.from(byCategory.entries())
    .map(([catSlug, catApps]) => {
      const catMeta = categories.find((c) => c.slug === catSlug);
      return { slug: catSlug, name: catMeta?.name ?? catSlug, count: catApps.length, apps: catApps };
    })
    .sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <Link href="/platforms" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" />
        All Platforms
      </Link>

      {/* Hero */}
      <div className={cn("relative overflow-hidden rounded-3xl border p-[1px]", `bg-gradient-to-br ${meta.color}`)}>
        <div className="relative rounded-[calc(1.5rem-1px)] bg-gradient-to-br from-surface via-surface to-surface-2 p-6 sm:p-8">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className={cn("absolute -right-20 -top-20 h-80 w-80 rounded-full blur-3xl opacity-20 bg-gradient-to-br", meta.color)} />
            <div className="bg-grid absolute inset-0 opacity-[0.03]" />
          </div>
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-4">
              <div className={cn("inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-raised", meta.color)}>
                <Icon className="h-7 w-7" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{meta.name} Store</h1>
                <p className="mt-1 text-sm text-muted">{meta.storeLike}</p>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{meta.longDescription}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {meta.packageTypes.map((pkg) => (
                    <span key={pkg} className="rounded-full border border-line bg-surface-2/50 px-2.5 py-1 text-xs font-medium">
                      {pkg}
                    </span>
                  ))}
                  <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
                    {appsResult.pagination.total} apps
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-white">
                <Download className="h-3.5 w-3.5" />
                Direct Downloads
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium">
                <Github className="h-3.5 w-3.5" />
                Source Links
              </span>
            </div>
          </div>
        </div>
      </div>

      <PlatformTabs platforms={platforms} activePlatform={slug} basePath="/platforms" />

      {/* Category filter */}
      <div className="space-y-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
          <Layers className="h-5 w-5 text-accent" />
          Browse by Category
        </h2>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/platforms/${slug}`}
            className={cn("rounded-full border px-4 py-2 text-sm font-medium transition-colors", !query.category ? "border-accent bg-accent text-white" : "border-line bg-surface-2/50 text-muted hover:border-accent/40 hover:text-fg")}
          >
            All Categories
          </Link>
          {categories.slice(0, 12).map((cat) => {
            const count = byCategory.get(cat.slug)?.length ?? 0;
            if (count === 0) return null;
            return (
              <Link
                key={cat.slug}
                href={`/platforms/${slug}?category=${cat.slug}`}
                className={cn("rounded-full border px-4 py-2 text-sm font-medium transition-colors", query.category === cat.slug ? "border-accent bg-accent text-white" : "border-line bg-surface-2/50 text-muted hover:border-accent/40 hover:text-fg")}
              >
                {cat.name} <span className="ml-1 tabular text-xs opacity-70">({count})</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Apps grid or categorized */}
      {query.category ? (
        <section className="space-y-4">
          <h2 className="font-display text-xl font-bold tracking-tight">
            {categories.find((c) => c.slug === query.category)?.name ?? query.category} for {meta.name}
          </h2>
          <StoreAppGrid apps={apps} preferredPlatform={slug as Platform} />
        </section>
      ) : (
        <div className="space-y-10">
          {sortedCategories.slice(0, 6).map((cat) => (
            <section key={cat.slug} className="space-y-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-semibold tracking-tight">{cat.name}</h2>
                  <p className="text-xs text-muted">{cat.count} apps for {meta.name}</p>
                </div>
                <Link href={`/platforms/${slug}?category=${cat.slug}`} className="text-sm font-medium text-accent hover:underline">
                  View all →
                </Link>
              </div>
              <StoreAppGrid apps={cat.apps.slice(0, 8)} preferredPlatform={slug as Platform} />
            </section>
          ))}

          {/* All apps if no categories matched */}
          {sortedCategories.length === 0 ? (
            <section className="space-y-4">
              <h2 className="font-display text-xl font-bold tracking-tight">All {meta.name} Apps</h2>
              <StoreAppGrid apps={apps} preferredPlatform={slug as Platform} />
            </section>
          ) : null}
        </div>
      )}

      {/* Pagination */}
      {appsResult.pagination.totalPages > 1 ? (
        <div className="flex items-center justify-center gap-2 pt-4">
          {appsResult.pagination.page > 1 ? (
            <Link href={`/platforms/${slug}?page=${appsResult.pagination.page - 1}${query.category ? `&category=${query.category}` : ""}`} className="rounded-full border border-line bg-surface px-4 py-2 text-sm hover:border-accent/40">
              ← Previous
            </Link>
          ) : null}
          <span className="text-sm tabular text-muted">
            Page {appsResult.pagination.page} of {appsResult.pagination.totalPages} • {appsResult.pagination.total} apps
          </span>
          {appsResult.pagination.page < appsResult.pagination.totalPages ? (
            <Link href={`/platforms/${slug}?page=${appsResult.pagination.page + 1}${query.category ? `&category=${query.category}` : ""}`} className="rounded-full border border-line bg-surface px-4 py-2 text-sm hover:border-accent/40">
              Next →
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
