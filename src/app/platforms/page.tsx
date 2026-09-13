import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Monitor, Laptop, Terminal, Smartphone, Apple, Layers, Download, Github, ArrowRight } from "lucide-react";

import { getOmnisource } from "@/lib/omnisource";
import { orFallback, orEmpty } from "@/lib/omnisource/with-fallback";
import { SectionHeading } from "@/components/ui/primitives";
import { PlatformShowcase } from "@/components/store/PlatformTabs";
import { CrossPlatformBanner, AutomationBanner } from "@/components/store/CrossPlatformBanner";
import { StoreAppGrid } from "@/components/store/StoreAppCard";
import { cn } from "@/lib/utils";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Platforms - OmniStore",
  description: "Browse open-source apps by platform: Windows, macOS, Linux, Android, iOS. Direct downloads, source links, cross-platform.",
  alternates: { canonical: "/platforms" },
};

const PLATFORM_META: Record<string, { name: string; description: string; longDescription: string; color: string; icon: typeof Monitor; packageTypes: string[] }> = {
  windows: {
    name: "Windows",
    description: "EXE, MSI, MSIX & portable",
    longDescription: "Native Windows apps with installers directly from GitHub releases. EXE, MSI, MSIX, AppX and portable ZIPs.",
    color: "from-blue-600 to-cyan-500",
    icon: Monitor,
    packageTypes: ["exe", "msi", "msix", "appx", "zip"],
  },
  macos: {
    name: "macOS",
    description: "DMG, PKG & universal",
    longDescription: "Signed DMGs and PKGs for Intel & Apple Silicon. Universal binaries and macOS-optimized builds.",
    color: "from-zinc-700 to-slate-600",
    icon: Laptop,
    packageTypes: ["dmg", "pkg", "zip"],
  },
  linux: {
    name: "Linux",
    description: "AppImage, Flatpak, DEB, RPM",
    longDescription: "Every Linux format: AppImage, Flatpak, DEB, RPM, Snap. Works on Ubuntu, Fedora, Arch, Debian & more.",
    color: "from-orange-600 to-amber-500",
    icon: Terminal,
    packageTypes: ["appimage", "flatpak", "deb", "rpm", "snap", "tar"],
  },
  android: {
    name: "Android",
    description: "APK & AAB direct",
    longDescription: "Direct APK downloads, no Play Store needed. F-Droid compatible, open source Android apps.",
    color: "from-green-600 to-emerald-500",
    icon: Smartphone,
    packageTypes: ["apk", "aab"],
  },
  ios: {
    name: "iOS",
    description: "IPA & TestFlight",
    longDescription: "iOS apps and TestFlight builds. Sideload-ready IPAs from open source projects.",
    color: "from-slate-700 to-zinc-600",
    icon: Apple,
    packageTypes: ["ipa"],
  },
};

export default async function PlatformsPage() {
  const t = await getTranslations("platforms");
  const client = getOmnisource();

  const [platforms, allAppsResult, categories] = await Promise.all([
    orEmpty(client.getPlatforms(), "platforms page"),
    orFallback(client.getApps({ perPage: 100 }), { items: [], pagination: { page: 1, perPage: 100, total: 0, totalPages: 0 }, freshness: null }, "all apps for platforms"),
    orEmpty(client.getCategories(), "categories for platforms"),
  ]);

  const apps = allAppsResult.items;

  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
          <Layers className="h-3.5 w-3.5" />
          Cross-Platform App Store
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Every Platform. <span className="text-gradient-brand">One Store.</span>
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-muted sm:text-base">
          Browse 444 open-source apps across Windows, macOS, Linux, Android and iOS. Like App Store, Play Store and F-Droid — but unified, open, and with direct downloads + source links for every app.
        </p>
      </div>

      <AutomationBanner />

      <PlatformShowcase platforms={platforms} />

      <CrossPlatformBanner />

      {/* Detailed platform cards */}
      <section className="space-y-6">
        <SectionHeading title="Platform Stores" description="Each platform is a full store with categories, direct downloads and source transparency." />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(PLATFORM_META).map(([slug, meta]) => {
            const platformApps = apps.filter((a) => (a.platforms ?? []).includes(slug as any));
            const Icon = meta.icon;
            return (
              <Link
                key={slug}
                href={`/platforms/${slug}`}
                className="group relative overflow-hidden rounded-2xl border border-line bg-surface p-6 transition-all hover:-translate-y-1 hover:border-accent/40 hover:shadow-glow"
              >
                <div className={cn("absolute inset-0 bg-gradient-to-br opacity-[0.06] group-hover:opacity-[0.12] transition-opacity", meta.color)} />
                <div className="relative">
                  <div className="flex items-start justify-between">
                    <div className={cn("inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-raised", meta.color)}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="rounded-full bg-surface-3 px-3 py-1 text-xs font-medium tabular">
                      {platformApps.length} apps
                    </span>
                  </div>
                  <h3 className="mt-4 font-display text-lg font-bold tracking-tight group-hover:text-accent">{meta.name}</h3>
                  <p className="mt-1 text-sm text-muted">{meta.longDescription}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {meta.packageTypes.map((pkg) => (
                      <span key={pkg} className="rounded-full border border-line bg-surface-2/50 px-2 py-0.5 text-2xs font-medium text-muted">
                        {pkg}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-white">
                      <Download className="h-3.5 w-3.5" />
                      Browse
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-muted group-hover:text-accent transition-colors">
                      Direct downloads + source
                      <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Cross-platform highlights */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold tracking-tight">Cross-Platform Champions</h2>
          <Link href="/apps?platform=windows,macos,linux" className="text-sm font-medium text-accent hover:underline">
            View all cross-platform →
          </Link>
        </div>
        <p className="text-sm text-muted">Apps that run natively on Windows, macOS and Linux — one codebase, every desktop.</p>
        <StoreAppGrid apps={apps.filter((a) => {
          const p = a.platforms ?? [];
          return p.includes("windows" as any) && p.includes("macos" as any) && p.includes("linux" as any);
        }).slice(0, 8)} />
      </section>
    </div>
  );
}
