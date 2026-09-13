"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Download, ExternalLink, ShieldCheck, ShieldQuestion, ShieldAlert, Github, Globe, Monitor, Laptop, Terminal, Smartphone, Apple, Package, HardDrive } from "lucide-react";

import type { App, Architecture, Platform, ReleaseAsset } from "@omnistore/shared-models";
import { architectureLabel, formatBytes, packageTypeLabel, platformLabel } from "@/lib/formatters";
import { safeHref } from "@/lib/security/urls";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics/client";

const PLATFORM_ICONS: Record<string, typeof Monitor> = {
  windows: Monitor,
  macos: Laptop,
  linux: Terminal,
  android: Smartphone,
  ios: Smartphone,
  ipados: Apple,
};

const PLATFORM_COLORS: Record<string, string> = {
  windows: "from-blue-500 to-cyan-500",
  macos: "from-zinc-600 to-slate-500",
  linux: "from-orange-500 to-amber-500",
  android: "from-green-500 to-emerald-500",
  ios: "from-slate-600 to-zinc-500",
};

/**
 * InstallPanel — App Store style download hand-off with direct download + source
 * Shows platform tabs, direct download buttons, and source links like Play Store / F-Droid
 */
export function InstallPanel({
  app,
  preferredPlatform,
}: {
  app: App;
  preferredPlatform: Platform | null;
}) {
  const t = useTranslations("app");
  const release = app.latestRelease;
  const assets = useMemo(() => release?.assets ?? [], [release]);

  const platforms = useMemo(
    () => [...new Set(assets.map((asset) => asset.platform).filter((p): p is Platform => p !== null))],
    [assets],
  );
  const [platform, setPlatform] = useState<Platform | null>(
    preferredPlatform && platforms.includes(preferredPlatform)
      ? preferredPlatform
      : (platforms[0] ?? null),
  );

  const repositoryHref = safeHref(app.repository);
  const homepageHref = safeHref(app.homepage);

  if (!release || assets.length === 0) {
    return (
      <div className="card space-y-4 p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Download className="h-4 w-4 text-accent" />
          {t("install")}
        </h2>
        <p className="text-sm text-muted">{t("noAssets")}</p>
        <div className="space-y-2">
          {repositoryHref ? (
            <a
              href={repositoryHref}
              target="_blank"
              rel="noopener noreferrer external"
              className="flex items-center gap-2 rounded-xl border border-line bg-surface-2/50 p-3 text-sm font-medium hover:border-accent/40 transition-colors"
            >
              <Github className="h-4 w-4" />
              View Source on GitHub
              <ExternalLink className="ml-auto h-3.5 w-3.5 text-subtle" />
            </a>
          ) : null}
          {homepageHref ? (
            <a
              href={homepageHref}
              target="_blank"
              rel="noopener noreferrer external"
              className="flex items-center gap-2 rounded-xl border border-line bg-surface-2/50 p-3 text-sm font-medium hover:border-accent/40 transition-colors"
            >
              <Globe className="h-4 w-4" />
              Visit Homepage
              <ExternalLink className="ml-auto h-3.5 w-3.5 text-subtle" />
            </a>
          ) : null}
        </div>
        <p className="text-2xs text-subtle">No installers published for this release. Check source for build instructions.</p>
      </div>
    );
  }

  const visible = assets.filter((asset) => asset.platform === platform);
  const groups = groupByArchitecture(visible);
  const platformMeta = platform ? { icon: PLATFORM_ICONS[platform] ?? Monitor, color: PLATFORM_COLORS[platform] ?? "from-accent to-accent-2" } : null;

  return (
    <div className="card overflow-hidden">
      {/* Header - App Store style */}
      <div className={cn("relative p-5 bg-gradient-to-br text-white", platformMeta ? platformMeta.color : "from-accent to-accent-2")}>
        <div className="absolute inset-0 bg-grid opacity-10" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              {platformMeta ? <platformMeta.icon className="h-5 w-5" /> : <Download className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-sm font-bold">
                {t("install")} {release.version ? <span className="font-normal opacity-90">· v{release.version}</span> : null}
              </h2>
              <p className="text-xs opacity-80">Direct download • No mirrors • Validated</p>
            </div>
          </div>
          {release.hasBreakingChanges ? (
            <span className="rounded-full bg-warning/20 border border-warning/30 px-2.5 py-1 text-2xs font-medium">
              {t("breakingChanges")}
            </span>
          ) : null}
        </div>
      </div>

      <div className="space-y-4 p-4">
        {/* Platform tabs - like Play Store */}
        {platforms.length > 1 ? (
          <div>
            <p className="mb-2 text-2xs font-semibold uppercase tracking-wide text-subtle">Choose Platform</p>
            <div role="tablist" aria-label={t("platforms")} className="flex flex-wrap gap-1.5">
              {platforms.map((candidate) => {
                const Icon = PLATFORM_ICONS[candidate] ?? Monitor;
                const isActive = candidate === platform;
                return (
                  <button
                    key={candidate}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setPlatform(candidate)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-medium transition-all",
                      isActive
                        ? "border-accent bg-accent text-white shadow-sm"
                        : "border-line bg-surface-2/50 text-muted hover:border-accent/40 hover:text-fg hover:bg-surface"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {platformLabel(candidate)}
                    <span className={cn("rounded-full px-1.5 py-0.5 text-2xs tabular", isActive ? "bg-white/20" : "bg-surface-3")}>
                      {assets.filter(a => a.platform === candidate).length}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Direct downloads */}
        <div className="space-y-3">
          <p className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-subtle">
            <Package className="h-3 w-3" />
            Direct Downloads for {platform ? platformLabel(platform) : "this release"}
          </p>
          <ul className="space-y-2">
            {groups.map(([architecture, groupAssets]) => (
              <li key={architecture ?? "any"} className="space-y-2">
                {groups.length > 1 ? (
                  <p className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-subtle">
                    <HardDrive className="h-3 w-3" />
                    {architecture ? architectureLabel(architecture) : "Any"} Architecture
                  </p>
                ) : null}
                {groupAssets.map((asset) => (
                  <AssetRow key={asset.id} appId={app.id} asset={asset} handoff={t("installHandoff")} downloadLabel={t("download")} />
                ))}
              </li>
            ))}
          </ul>
        </div>

        {/* Source links - always visible like F-Droid */}
        <div className="space-y-2 rounded-xl border border-line bg-surface-2/30 p-3">
          <p className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-subtle">
            <Github className="h-3 w-3" />
            Source & Links — Verify before install
          </p>
          <div className="grid gap-2">
            {repositoryHref ? (
              <a
                href={repositoryHref}
                target="_blank"
                rel="noopener noreferrer external"
                className="group flex items-center gap-2.5 rounded-xl bg-surface px-3 py-2.5 text-sm font-medium border border-line hover:border-accent/40 transition-colors"
              >
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-surface-3 group-hover:bg-accent-soft transition-colors">
                  <Github className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">Source Code</p>
                  <p className="truncate text-2xs text-muted">{app.repository}</p>
                </div>
                <ExternalLink className="h-4 w-4 text-subtle group-hover:text-accent" />
              </a>
            ) : null}
            {homepageHref && homepageHref !== repositoryHref ? (
              <a
                href={homepageHref}
                target="_blank"
                rel="noopener noreferrer external"
                className="group flex items-center gap-2.5 rounded-xl bg-surface px-3 py-2.5 text-sm font-medium border border-line hover:border-accent/40 transition-colors"
              >
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-surface-3 group-hover:bg-accent-soft">
                  <Globe className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">Homepage</p>
                  <p className="truncate text-2xs text-muted">{app.homepage}</p>
                </div>
                <ExternalLink className="h-4 w-4 text-subtle group-hover:text-accent" />
              </a>
            ) : null}
          </div>
        </div>

        <p className="text-2xs leading-relaxed text-subtle flex items-start gap-1.5">
          <ShieldCheck className="h-3 w-3 mt-0.5 text-success shrink-0" />
          <span>{t("installHandoff")} OmniStore never mirrors binaries — all downloads go directly to {platform ? platformLabel(platform!) : "upstream"} release host (GitHub). Source link always visible for audit.</span>
        </p>
      </div>
    </div>
  );
}

function groupByArchitecture(assets: ReleaseAsset[]): Array<[Architecture | null, ReleaseAsset[]]> {
  const map = new Map<Architecture | null, ReleaseAsset[]>();
  for (const asset of assets) {
    const list = map.get(asset.architecture) ?? [];
    list.push(asset);
    map.set(asset.architecture, list);
  }
  return [...map.entries()];
}

function AssetRow({
  appId,
  asset,
  handoff,
  downloadLabel,
}: {
  appId: string;
  asset: ReleaseAsset;
  handoff: string;
  downloadLabel: string;
}) {
  const t = useTranslations("security");
  const href = safeHref(asset.url);
  const valid = asset.status === "VALID";
  const icon =
    asset.status === "VALID" ? (
      <ShieldCheck className="h-3.5 w-3.5 text-success" aria-label={asset.status} />
    ) : asset.status === "UNKNOWN" || asset.status === "REVIEW_REQUIRED" ? (
      <ShieldQuestion className="h-3.5 w-3.5 text-warning" aria-label={asset.status} />
    ) : (
      <ShieldAlert className="h-3.5 w-3.5 text-danger" aria-label={asset.status} />
    );

  return (
    <div className="group flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-3 transition-colors hover:border-accent/30 hover:bg-surface-2/50">
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Package className="h-3.5 w-3.5" />
          </span>
          <span className="block truncate text-sm font-semibold">
            {packageTypeLabel(asset.packageType)}
          </span>
          {asset.sizeBytes != null ? (
            <span className="rounded-full bg-surface-3 px-2 py-0.5 text-2xs font-medium tabular text-muted">{formatBytes(asset.sizeBytes)}</span>
          ) : null}
        </span>
        <span className="mt-1 flex items-center gap-1.5 text-2xs text-subtle">
          {icon}
          <span>{valid ? "✓ Validated • Direct from GitHub" : t("scanStatus") + ": " + asset.status}</span>
          {asset.sha256 ? (
            <span className="hidden font-mono sm:inline rounded-full bg-success/10 px-1.5 py-0.5 text-2xs text-success" title={`sha256:${asset.sha256}`}>
              sha256 ✓
            </span>
          ) : null}
        </span>
      </span>
      {valid && href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer external"
          title={handoff}
          onClick={() => trackEvent({ type: "download_click", appId, metadata: { packageType: asset.packageType, platform: asset.platform } })}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-accent-hover hover:shadow-glow hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
          {downloadLabel}
        </a>
      ) : (
        <span className="shrink-0 rounded-full bg-surface-3 px-3 py-1.5 text-2xs font-medium text-muted">
          {asset.status}
        </span>
      )}
    </div>
  );
}
