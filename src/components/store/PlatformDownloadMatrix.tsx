"use client";

import { Download, Github, ShieldCheck, Package, Monitor, Laptop, Terminal, Smartphone, Apple } from "lucide-react";
import type { App, Platform, ReleaseAsset } from "@omnistore/shared-models";
import { formatBytes, packageTypeLabel } from "@/lib/formatters";
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

export function PlatformDownloadMatrix({ app }: { app: App }) {
  const assets = app.latestRelease?.assets ?? [];
  const validAssets = assets.filter(a => a.status === "VALID");
  
  if (validAssets.length === 0) return null;

  const byPlatform = validAssets.reduce((acc, asset) => {
    const p = asset.platform ?? "unknown";
    if (!acc[p]) acc[p] = [];
    acc[p].push(asset);
    return acc;
  }, {} as Record<string, ReleaseAsset[]>);

  return (
    <div className="card overflow-hidden">
      <div className="p-4 border-b border-line bg-surface-2/30">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <Package className="h-4 w-4 text-accent" />
          Direct Downloads — All Platforms
          <span className="rounded-full bg-accent-soft px-2 py-0.5 text-2xs font-semibold text-accent">{validAssets.length} files</span>
        </h3>
        <p className="mt-1 text-2xs text-muted">Like Play Store / F-Droid — direct from GitHub, source always visible. No mirrors.</p>
      </div>
      <div className="divide-y divide-line/60">
        {Object.entries(byPlatform).map(([platform, platformAssets]) => {
          const Icon = PLATFORM_ICONS[platform] ?? Package;
          const color = PLATFORM_COLORS[platform] ?? "from-accent to-accent-2";
          return (
            <div key={platform} className="p-4 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className={cn("inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm", color)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold capitalize">{platform}</p>
                  <p className="text-2xs text-muted">{platformAssets.length} download{platformAssets.length > 1 ? "s" : ""} • Direct from upstream</p>
                </div>
                <span className="ml-auto rounded-full bg-success/10 px-2 py-0.5 text-2xs font-semibold text-success flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  Validated
                </span>
              </div>
              <div className="grid gap-2">
                {platformAssets.map((asset) => {
                  const href = safeHref(asset.url);
                  if (!href) return null;
                  return (
                    <a
                      key={asset.id}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackEvent({ type: "download_click", appId: app.id, metadata: { platform, packageType: asset.packageType } })}
                      className="group flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5 transition-all hover:border-accent/40 hover:bg-surface-2/50 hover:-translate-y-0.5"
                    >
                      <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-surface-3 group-hover:bg-accent-soft transition-colors">
                        <Download className="h-4 w-4 text-muted group-hover:text-accent" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 text-sm font-medium">
                          <span>{packageTypeLabel(asset.packageType)}</span>
                          {asset.architecture ? <span className="rounded-full bg-surface-3 px-1.5 py-0.5 text-2xs font-mono">{asset.architecture}</span> : null}
                          {asset.sizeBytes ? <span className="text-xs text-muted">{formatBytes(asset.sizeBytes)}</span> : null}
                        </p>
                        <p className="text-2xs text-muted truncate">{asset.url.split("/").pop()}</p>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-white group-hover:bg-accent-hover transition-colors">
                        <Download className="h-3 w-3" />
                        Get
                      </span>
                    </a>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="p-3 bg-surface-2/30 border-t border-line flex items-center gap-2 text-2xs text-muted">
        <Github className="h-3.5 w-3.5" />
        <span>Source: <a href={app.repository ?? "#"} target="_blank" rel="noopener noreferrer" className="font-medium text-accent hover:underline">{app.repository}</a> • All downloads direct from GitHub releases, never mirrored</span>
      </div>
    </div>
  );
}

export function StickyDownloadBar({ app }: { app: App }) {
  const assets = app.latestRelease?.assets ?? [];
  const validAssets = assets.filter(a => a.status === "VALID");
  const primary = validAssets[0];
  const href = primary ? safeHref(primary.url) : null;
  const repoHref = safeHref(app.repository);

  if (!primary || !href) return null;

  return (
    <div className="sticky bottom-0 z-30 border-t border-line bg-bg/80 backdrop-blur-xl p-3 sm:hidden">
      <div className="flex items-center gap-2">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent({ type: "download_click", appId: app.id, metadata: { platform: primary.platform } })}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-bold text-white shadow-glow"
        >
          <Download className="h-4 w-4" />
          Download v{app.version ?? primary.version}
        </a>
        {repoHref ? (
          <a href={repoHref} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface">
            <Github className="h-5 w-5" />
          </a>
        ) : null}
      </div>
    </div>
  );
}
