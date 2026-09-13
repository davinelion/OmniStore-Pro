"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Download,
  ExternalLink,
  Github,
  Globe,
  Monitor,
  Laptop,
  Smartphone,
  Terminal,
  Tablet,
  ShieldCheck,
  Star,
  ArrowRight,
} from "lucide-react";

import type { App, Platform, ReleaseAsset } from "@omnistore/shared-models";
import { formatBytes, formatCompactNumber, packageTypeLabel, relativeTime } from "@/lib/formatters";
import { safeHref, safeImageUrl } from "@/lib/security/urls";
import { sourceFromRepository } from "@/lib/sources";
import { cn } from "@/lib/utils";
import { AppIcon } from "@/components/app/AppIcon";
import { trackEvent } from "@/lib/analytics/client";

const PLATFORM_ICONS: Record<string, typeof Monitor> = {
  windows: Monitor,
  macos: Laptop,
  linux: Terminal,
  android: Smartphone,
  ios: Smartphone,
  ipados: Tablet,
};

type StoreCardVariant = "default" | "compact" | "featured" | "list" | "platform";

export function StoreAppCard({
  app,
  variant = "default",
  preferredPlatform,
  showDownload = true,
  showSource = true,
  className,
}: {
  app: App;
  variant?: StoreCardVariant;
  preferredPlatform?: Platform | null;
  showDownload?: boolean;
  showSource?: boolean;
  className?: string;
}) {
  const t = useTranslations("app");
  const source = sourceFromRepository(app.repository);
  const href = `/app/${app.slug}`;

  // Determine best asset for download
  const assets = app.latestRelease?.assets ?? [];
  const validAssets = assets.filter((a) => a.status === "VALID");
  
  // Group by platform for quick access
  const assetsByPlatform = validAssets.reduce((acc, asset) => {
    const p = asset.platform as Platform;
    if (!acc[p]) acc[p] = [];
    acc[p].push(asset);
    return acc;
  }, {} as Record<string, ReleaseAsset[]>);

  const platforms = (app.platforms ?? []) as Platform[];
  const primaryPlatform = preferredPlatform && platforms.includes(preferredPlatform) ? preferredPlatform : platforms[0];
  const primaryAssets = primaryPlatform ? assetsByPlatform[primaryPlatform] ?? [] : [];
  const primaryAsset = primaryAssets[0] ?? validAssets[0];

  const repositoryHref = safeHref(app.repository);
  const homepageHref = safeHref(app.homepage);

  if (variant === "compact") {
    return (
      <Link
        href={href}
        className={cn(
          "group flex items-center gap-3 rounded-xl border border-line/60 bg-surface/50 p-3 transition-all hover:border-accent/40 hover:bg-surface hover:shadow-sm",
          className
        )}
      >
        <AppIcon name={app.name} src={app.icon} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold group-hover:text-accent">{app.name}</p>
          <p className="truncate text-xs text-muted">{app.developer ?? source}</p>
        </div>
        {app.trustScore != null ? (
          <span className="rounded-full bg-success/10 px-2 py-0.5 text-2xs font-semibold text-success">
            {app.trustScore}
          </span>
        ) : null}
      </Link>
    );
  }

  if (variant === "list") {
    return (
      <div className={cn("group flex gap-4 rounded-2xl border border-line bg-surface p-4 transition-all hover:border-accent/30 hover:shadow-glow", className)}>
        <Link href={href} className="shrink-0">
          <AppIcon name={app.name} src={app.icon} size="lg" className="h-16 w-16" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <Link href={href} className="group-hover:text-accent">
                <h3 className="truncate font-display text-base font-semibold">{app.name}</h3>
              </Link>
              <p className="truncate text-xs text-muted">{app.developer}</p>
              <p className="mt-1 line-clamp-2 text-sm text-muted">{app.shortDescription}</p>
            </div>
            <div className="flex items-center gap-1.5">
              {platforms.map((p) => {
                const Icon = PLATFORM_ICONS[p] ?? Monitor;
                return (
                  <span key={p} title={p} className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-muted">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                );
              })}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {showDownload && primaryAsset && safeHref(primaryAsset.url) ? (
              <a
                href={safeHref(primaryAsset.url)!}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent({ type: "download_click", appId: app.id, metadata: { platform: primaryAsset.platform } })}
                className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover"
              >
                <Download className="h-3.5 w-3.5" />
                Download {primaryPlatform ? `for ${primaryPlatform}` : ""}
              </a>
            ) : (
              <Link href={href} className="inline-flex items-center gap-1.5 rounded-full bg-surface-3 px-4 py-1.5 text-xs font-semibold">
                View Details
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
            {showSource && repositoryHref ? (
              <a href={repositoryHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-medium hover:border-accent/40">
                <Github className="h-3.5 w-3.5" />
                Source
              </a>
            ) : null}
            {app.version ? <span className="rounded-full bg-surface-3 px-2.5 py-1 font-mono text-2xs">v{app.version}</span> : null}
            {app.updatedAt ? <span className="text-2xs text-subtle">{relativeTime(app.updatedAt)}</span> : null}
          </div>
        </div>
      </div>
    );
  }

  if (variant === "featured") {
    return (
      <Link
        href={href}
        className={cn("group relative overflow-hidden rounded-3xl border border-line bg-surface p-6 transition-all hover:-translate-y-1 hover:shadow-glow hover:border-accent/30", className)}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-accent-2/5 to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-accent/20 to-accent-2/20 blur-3xl group-hover:from-accent/30 group-hover:to-accent-2/30 transition-all" />
        <div className="relative flex gap-5">
          <AppIcon name={app.name} src={app.icon} size="xl" className="h-20 w-20 shadow-raised ring-1 ring-line/50" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-display text-xl font-bold tracking-tight group-hover:text-accent">{app.name}</h3>
                <p className="mt-0.5 text-sm text-muted">{app.developer}</p>
              </div>
              {app.trustScore != null ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {app.trustScore}
                </span>
              ) : null}
            </div>
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">{app.shortDescription ?? app.description}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {platforms.slice(0, 5).map((p) => {
                const Icon = PLATFORM_ICONS[p] ?? Monitor;
                return (
                  <span key={p} className="inline-flex items-center gap-1 rounded-full bg-surface-3 px-2.5 py-1 text-2xs font-medium">
                    <Icon className="h-3 w-3" />
                    {p}
                  </span>
                );
              })}
              {app.downloadCount != null ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-2xs font-medium text-accent">
                  <Download className="h-3 w-3" />
                  {formatCompactNumber(app.downloadCount)}
                </span>
              ) : null}
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-white">
                <Download className="h-3.5 w-3.5" />
                Get App
              </span>
              {repositoryHref ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/70 px-3 py-2 text-xs font-medium">
                  <Github className="h-3.5 w-3.5" />
                  Source
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // Default grid card - App Store style with direct download + source
  return (
    <div className={cn("group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface transition-all hover:-translate-y-1 hover:border-accent/30 hover:shadow-glow", className)}>
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-surface-2/30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      
      <Link href={href} className="relative flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          <AppIcon name={app.name} src={app.icon} size="lg" className="h-12 w-12 rounded-xl shadow-sm ring-1 ring-line/40 group-hover:scale-105 transition-transform duration-300" />
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-display text-[0.95rem] font-semibold leading-snug tracking-tight group-hover:text-accent transition-colors">
              {app.name}
            </h3>
            <p className="truncate text-xs text-muted">{app.developer ?? source}</p>
            <div className="mt-1.5 flex items-center gap-1">
              {platforms.slice(0, 4).map((p) => {
                const Icon = PLATFORM_ICONS[p] ?? Monitor;
                return (
                  <span key={p} title={p} className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-surface-2 text-subtle group-hover:bg-surface-3 group-hover:text-muted transition-colors">
                    <Icon className="h-3 w-3" />
                  </span>
                );
              })}
              {platforms.length > 4 ? <span className="text-2xs text-subtle">+{platforms.length - 4}</span> : null}
            </div>
          </div>
          {app.trustScore != null ? (
            <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-2xs font-bold tabular", app.trustScore >= 80 ? "bg-success/10 text-success" : app.trustScore >= 50 ? "bg-warning/10 text-warning" : "bg-surface-3 text-muted")}>
              {app.trustScore}
            </span>
          ) : null}
        </div>

        <p className="line-clamp-2 min-h-[2.5em] text-[13px] leading-[1.5] text-muted">
          {app.shortDescription || app.description || "Open-source app"}
        </p>

        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
          {app.version ? <span className="rounded-full bg-surface-3 px-2 py-0.5 font-mono text-2xs">v{app.version}</span> : null}
          {app.license ? <span className="rounded-full border border-line px-2 py-0.5 text-2xs text-subtle">{app.license}</span> : null}
          {app.updatedAt ? <span className="text-2xs text-subtle">{relativeTime(app.updatedAt)}</span> : null}
        </div>
      </Link>

      {/* Action bar - direct download + source */}
      <div className="relative flex items-center gap-1.5 border-t border-line/60 bg-surface-2/50 p-2 backdrop-blur-sm">
        {showDownload && primaryAsset && safeHref(primaryAsset.url) ? (
          <a
            href={safeHref(primaryAsset.url)!}
            target="_blank"
            rel="noopener noreferrer external"
            onClick={(e) => {
              e.stopPropagation();
              trackEvent({ type: "download_click", appId: app.id, metadata: { platform: primaryAsset.platform, packageType: primaryAsset.packageType } });
            }}
            title={`Download ${packageTypeLabel(primaryAsset.packageType)} for ${primaryAsset.platform} ${primaryAsset.sizeBytes ? `(${formatBytes(primaryAsset.sizeBytes)})` : ""}`}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-accent px-3 py-2 text-xs font-semibold text-white transition-all hover:bg-accent-hover hover:shadow-sm active:scale-[0.98]"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="truncate">
              {primaryPlatform ? `Get for ${primaryPlatform}` : "Download"}
            </span>
          </a>
        ) : (
          <Link href={href} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-surface-3 px-3 py-2 text-xs font-semibold hover:bg-surface">
            <ArrowRight className="h-3.5 w-3.5" />
            Details
          </Link>
        )}

        {showSource && repositoryHref ? (
          <a
            href={repositoryHref}
            target="_blank"
            rel="noopener noreferrer external"
            onClick={(e) => e.stopPropagation()}
            title={`View source on ${source}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface text-muted transition-colors hover:border-accent/40 hover:text-fg hover:bg-surface-2"
          >
            <Github className="h-4 w-4" />
          </a>
        ) : null}

        {homepageHref && homepageHref !== repositoryHref ? (
          <a
            href={homepageHref}
            target="_blank"
            rel="noopener noreferrer external"
            onClick={(e) => e.stopPropagation()}
            title="Visit homepage"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface text-muted transition-colors hover:border-accent/40 hover:text-fg"
          >
            <Globe className="h-4 w-4" />
          </a>
        ) : null}
      </div>

      {/* Quick platform switcher if multiple */}
      {validAssets.length > 1 && platforms.length > 1 ? (
        <div className="flex items-center gap-1 border-t border-line/40 bg-surface/50 px-2 py-1.5">
          <span className="mr-1 text-2xs font-medium text-subtle">Also:</span>
          {platforms.slice(0, 5).map((p) => {
            const assets = assetsByPlatform[p];
            if (!assets || assets.length === 0) return null;
            const asset = assets[0];
            const href = safeHref(asset.url);
            if (!href) return null;
            const Icon = PLATFORM_ICONS[p] ?? Monitor;
            return (
              <a
                key={p}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.stopPropagation();
                  trackEvent({ type: "download_click", appId: app.id, metadata: { platform: p } });
                }}
                title={`Download for ${p} - ${packageTypeLabel(asset.packageType)}`}
                className="inline-flex items-center gap-1 rounded-full bg-surface-3 px-2 py-0.5 text-2xs font-medium text-muted hover:bg-accent-soft hover:text-accent transition-colors"
              >
                <Icon className="h-3 w-3" />
                {p}
              </a>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function StoreAppGrid({
  apps,
  variant = "default",
  preferredPlatform,
  className,
}: {
  apps: App[];
  variant?: StoreCardVariant;
  preferredPlatform?: Platform | null;
  className?: string;
}) {
  if (variant === "featured") {
    return (
      <div className={cn("grid gap-4 md:grid-cols-2", className)}>
        {apps.map((app) => (
          <StoreAppCard key={app.id} app={app} variant="featured" preferredPlatform={preferredPlatform} />
        ))}
      </div>
    );
  }
  if (variant === "list") {
    return (
      <div className={cn("space-y-3", className)}>
        {apps.map((app) => (
          <StoreAppCard key={app.id} app={app} variant="list" preferredPlatform={preferredPlatform} />
        ))}
      </div>
    );
  }
  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4", className)}>
      {apps.map((app) => (
        <StoreAppCard key={app.id} app={app} variant={variant} preferredPlatform={preferredPlatform} />
      ))}
    </div>
  );
}
