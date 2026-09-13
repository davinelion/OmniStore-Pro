"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Apple, Laptop, Monitor, Smartphone, Tablet, Terminal, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlatformInfo } from "@omnistore/shared-models";

const PLATFORM_ICONS: Record<string, typeof Smartphone> = {
  ios: Smartphone,
  ipados: Tablet,
  android: Smartphone,
  windows: Monitor,
  macos: Laptop,
  linux: Terminal,
};

const PLATFORM_COLORS: Record<string, string> = {
  windows: "from-blue-500/20 to-cyan-500/20 border-blue-500/30 hover:border-blue-500/60",
  macos: "from-zinc-500/20 to-slate-500/20 border-zinc-500/30 hover:border-zinc-500/60",
  linux: "from-orange-500/20 to-yellow-500/20 border-orange-500/30 hover:border-orange-500/60",
  android: "from-green-500/20 to-emerald-500/20 border-green-500/30 hover:border-green-500/60",
  ios: "from-slate-500/20 to-gray-500/20 border-slate-500/30 hover:border-slate-500/60",
  ipados: "from-purple-500/20 to-violet-500/20 border-purple-500/30 hover:border-purple-500/60",
};

export function PlatformTabs({
  platforms,
  activePlatform,
  showAll = true,
  basePath = "/apps",
}: {
  platforms: PlatformInfo[];
  activePlatform?: string | null;
  showAll?: boolean;
  basePath?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const buildHref = (platformSlug: string | null) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (platformSlug) {
      params.set("platform", platformSlug);
    } else {
      params.delete("platform");
    }
    params.set("page", "1");
    const query = params.toString();
    return `${basePath}${query ? `?${query}` : ""}`;
  };

  const allPlatforms = platforms.length > 0 ? platforms : [
    { id: "windows", slug: "windows", name: "Windows", displayName: "Windows", icon: "Monitor", appCount: 230 },
    { id: "macos", slug: "macos", name: "macOS", displayName: "macOS", icon: "Laptop", appCount: 173 },
    { id: "linux", slug: "linux", name: "Linux", displayName: "Linux", icon: "Terminal", appCount: 207 },
    { id: "android", slug: "android", name: "Android", displayName: "Android", icon: "Smartphone", appCount: 39 },
    { id: "ios", slug: "ios", name: "iOS", displayName: "iOS", icon: "Smartphone", appCount: 9 },
  ] as PlatformInfo[];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {showAll ? (
        <Link
          href={buildHref(null)}
          className={cn(
            "group inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all",
            !activePlatform
              ? "border-accent bg-accent text-white shadow-glow"
              : "border-line bg-surface-2/50 text-muted hover:border-accent/40 hover:text-fg hover:bg-surface"
          )}
        >
          <Layers className="h-4 w-4" />
          All Platforms
        </Link>
      ) : null}
      {allPlatforms.map((platform) => {
        const slug = platform.slug ?? platform.id ?? platform.name.toLowerCase();
        const Icon = PLATFORM_ICONS[slug] ?? Monitor;
        const isActive = activePlatform === slug;
        const colorClass = PLATFORM_COLORS[slug] ?? "from-accent/20 to-accent-2/20 border-accent/30";

        return (
          <Link
            key={slug}
            href={basePath.startsWith("/platforms") ? `/platforms/${slug}` : buildHref(slug)}
            className={cn(
              "group inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all hover:-translate-y-0.5",
              isActive
                ? "border-accent bg-accent text-white shadow-glow"
                : `bg-gradient-to-br ${colorClass} bg-surface-2/50 backdrop-blur-sm`
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{platform.displayName ?? platform.name}</span>
            {platform.appCount != null ? (
              <span className={cn("rounded-full px-2 py-0.5 text-xs tabular", isActive ? "bg-white/20" : "bg-surface-3")}>
                {platform.appCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}

export function PlatformShowcase({
  platforms,
}: {
  platforms: PlatformInfo[];
}) {
  const all = platforms.length > 0 ? platforms : [
    { id: "windows", slug: "windows", name: "Windows", displayName: "Windows", icon: "Monitor", appCount: 230 },
    { id: "macos", slug: "macos", name: "macOS", displayName: "macOS", icon: "Laptop", appCount: 173 },
    { id: "linux", slug: "linux", name: "Linux", displayName: "Linux", icon: "Terminal", appCount: 207 },
    { id: "android", slug: "android", name: "Android", displayName: "Android", icon: "Smartphone", appCount: 39 },
    { id: "ios", slug: "ios", name: "iOS", displayName: "iOS", icon: "Smartphone", appCount: 9 },
  ] as PlatformInfo[];

  const PLATFORM_META: Record<string, { description: string; gradient: string }> = {
    windows: { description: "Native EXE, MSI, MSIX & portable apps", gradient: "from-blue-600 to-cyan-500" },
    macos: { description: "Signed DMG, PKG & universal binaries", gradient: "from-zinc-700 to-slate-600" },
    linux: { description: "AppImage, Flatpak, DEB, RPM & Snap", gradient: "from-orange-600 to-amber-500" },
    android: { description: "APK & AAB direct installs", gradient: "from-green-600 to-emerald-500" },
    ios: { description: "IPA & TestFlight builds", gradient: "from-slate-700 to-zinc-600" },
  };

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {all.map((platform) => {
        const slug = platform.slug ?? platform.id ?? platform.name.toLowerCase();
        const Icon = PLATFORM_ICONS[slug] ?? Monitor;
        const meta = PLATFORM_META[slug] ?? { description: "Cross-platform apps", gradient: "from-accent to-accent-2" };
        return (
          <Link
            key={slug}
            href={`/platforms/${slug}`}
            className="group relative overflow-hidden rounded-2xl border border-line bg-surface p-5 transition-all hover:-translate-y-1 hover:border-accent/40 hover:shadow-glow"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${meta.gradient} opacity-[0.08] group-hover:opacity-[0.15] transition-opacity`} />
            <div className="relative">
              <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${meta.gradient} text-white shadow-raised`}>
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 font-display text-base font-semibold tracking-tight">{platform.displayName ?? platform.name}</h3>
              <p className="mt-1 text-xs text-muted line-clamp-2">{meta.description}</p>
              <div className="mt-3 flex items-center gap-2">
                <span className="rounded-full bg-surface-3 px-2.5 py-1 text-xs font-medium tabular">
                  {platform.appCount ?? 0} apps
                </span>
                <span className="text-xs text-accent opacity-0 group-hover:opacity-100 transition-opacity">Explore →</span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
