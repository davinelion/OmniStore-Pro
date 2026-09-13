"use client";

import Link from "next/link";
import { useState } from "react";
import { Monitor, Laptop, Terminal, Smartphone, Apple, Layers, ArrowRight, Download, Github } from "lucide-react";
import type { App, Category, Platform } from "@omnistore/shared-models";
import { cn } from "@/lib/utils";
import { StoreAppCard, StoreAppGrid } from "./StoreAppCard";

const PLATFORM_ICONS: Record<string, typeof Monitor> = {
  windows: Monitor,
  macos: Laptop,
  linux: Terminal,
  android: Smartphone,
  ios: Apple,
  ipados: Apple,
};

const PLATFORM_DETAILS: Record<string, { name: string; description: string; color: string; packageTypes: string[] }> = {
  windows: { name: "Windows", description: "EXE, MSI, MSIX & portable ZIP", color: "from-blue-600 to-cyan-500", packageTypes: ["exe", "msi", "msix", "zip"] },
  macos: { name: "macOS", description: "DMG, PKG & universal binaries", color: "from-zinc-700 to-slate-600", packageTypes: ["dmg", "pkg", "zip"] },
  linux: { name: "Linux", description: "AppImage, Flatpak, DEB, RPM", color: "from-orange-600 to-amber-500", packageTypes: ["appimage", "flatpak", "deb", "rpm", "snap"] },
  android: { name: "Android", description: "APK & AAB direct install", color: "from-green-600 to-emerald-500", packageTypes: ["apk", "aab"] },
  ios: { name: "iOS", description: "IPA & TestFlight", color: "from-slate-700 to-zinc-600", packageTypes: ["ipa"] },
};

export function PlatformStoreSection({
  platform,
  apps,
  categories,
  preferredPlatform,
}: {
  platform: string;
  apps: App[];
  categories: Category[];
  preferredPlatform?: Platform | null;
}) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const details = PLATFORM_DETAILS[platform] ?? { name: platform, description: "Cross-platform", color: "from-accent to-accent-2", packageTypes: [] };
  const Icon = PLATFORM_ICONS[platform] ?? Monitor;

  // Filter apps by platform and category
  const platformApps = apps.filter((app) => (app.platforms ?? []).includes(platform as Platform));
  const filtered = activeCategory ? platformApps.filter((app) => (app.categories ?? []).includes(activeCategory)) : platformApps;

  // Category counts for this platform
  const categoryCounts = categories
    .map((cat) => ({
      slug: cat.slug,
      name: cat.name,
      count: platformApps.filter((app) => (app.categories ?? []).includes(cat.slug)).length,
    }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  if (platformApps.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={cn("inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-raised", details.color)}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="flex items-center gap-2 font-display text-xl font-bold tracking-tight">
              {details.name}
              <span className="rounded-full bg-surface-3 px-2.5 py-0.5 text-xs font-medium tabular">{platformApps.length} apps</span>
            </h2>
            <p className="text-xs text-muted">{details.description} • {details.packageTypes.join(", ")}</p>
          </div>
        </div>
        <Link href={`/platforms/${platform}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">
          View all {details.name} apps
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Category chips for this platform */}
      {categoryCounts.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveCategory(null)}
            className={cn("rounded-full border px-3 py-1.5 text-xs font-medium transition-colors", !activeCategory ? "border-accent bg-accent text-white" : "border-line bg-surface-2/50 text-muted hover:border-accent/40 hover:text-fg")}
          >
            All
          </button>
          {categoryCounts.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => setActiveCategory(cat.slug)}
              className={cn("rounded-full border px-3 py-1.5 text-xs font-medium transition-colors", activeCategory === cat.slug ? "border-accent bg-accent text-white" : "border-line bg-surface-2/50 text-muted hover:border-accent/40 hover:text-fg")}
            >
              {cat.name} <span className="ml-1 tabular opacity-70">({cat.count})</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {filtered.slice(0, 8).map((app) => (
          <StoreAppCard key={app.id} app={app} preferredPlatform={platform as Platform} />
        ))}
      </div>

      {filtered.length > 8 ? (
        <div className="text-center">
          <Link href={`/platforms/${platform}${activeCategory ? `?category=${activeCategory}` : ""}`} className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-5 py-2 text-sm font-medium hover:border-accent/40 transition-colors">
            Show {filtered.length - 8} more {details.name} apps
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : null}
    </section>
  );
}

export function AllPlatformsShowcase({
  apps,
  categories,
}: {
  apps: App[];
  categories: Category[];
}) {
  const platforms = ["windows", "macos", "linux", "android", "ios"] as const;

  return (
    <div className="space-y-12">
      {platforms.map((platform) => (
        <PlatformStoreSection key={platform} platform={platform} apps={apps} categories={categories} />
      ))}
    </div>
  );
}

export function CrossPlatformHighlights({
  apps,
}: {
  apps: App[];
}) {
  const crossPlatform = apps.filter((app) => (app.platforms?.length ?? 0) >= 3).slice(0, 8);
  const windowsMac = apps.filter((app) => {
    const p = app.platforms ?? [];
    return p.includes("windows" as any) && p.includes("macos" as any) && p.includes("linux" as any);
  }).slice(0, 4);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-line bg-gradient-to-br from-surface via-accent-soft/20 to-accent-2/10 p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 font-display text-xl font-bold tracking-tight sm:text-2xl">
              <Layers className="h-6 w-6 text-accent" />
              Seamless Cross-Platform
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted sm:text-base">
              One app, every device. These apps run natively on Windows, macOS, Linux, Android & iOS — no compromises, no vendor lock-in. Direct downloads, open source, fully audited.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white">
              <Download className="h-3.5 w-3.5" />
              Direct Download
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium">
              <Github className="h-3.5 w-3.5" />
              Source Available
            </span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {crossPlatform.map((app) => (
            <StoreAppCard key={app.id} app={app} />
          ))}
        </div>
      </div>

      {windowsMac.length > 0 ? (
        <section className="space-y-3">
          <h3 className="font-display text-lg font-semibold tracking-tight">Works everywhere — Windows • macOS • Linux</h3>
          <StoreAppGrid apps={windowsMac} />
        </section>
      ) : null}
    </div>
  );
}
