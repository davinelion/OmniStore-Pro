"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Download, 
  Github, 
  MoreVertical, 
  Check, 
  X, 
  RotateCcw, 
  Settings, 
  Wifi, 
  BatteryCharging,
  Bell,
  Eye,
  EyeOff,
  Zap,
  Clock,
  ShieldCheck,
  ExternalLink,
  ChevronDown,
  Package
} from "lucide-react";
import type { App } from "@omnistore/shared-models";
import type { TrackedApp } from "@/lib/track/types";
import { AppIcon } from "@/components/app/AppIcon";
import { relativeTime, formatBytes, packageTypeLabel, platformLabel } from "@/lib/formatters";
import { safeHref } from "@/lib/security/urls";
import { cn } from "@/lib/utils";

interface ObtainiumCardProps {
  tracked: TrackedApp;
  app?: App | null;
  onUpdate: (key: string, patch: Partial<TrackedApp>) => void;
  onAcknowledge: (key: string) => void;
  onSkip: (key: string, version: string | null) => void;
  onUntrack: (key: string) => void;
  onSetInstalled: (key: string, version: string) => void;
}

export function ObtainiumCard({ tracked, app, onUpdate, onAcknowledge, onSkip, onUntrack, onSetInstalled }: ObtainiumCardProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [showReleases, setShowReleases] = useState(false);
  const hasUpdate = tracked.latestVersion && (tracked.installedVersion ?? tracked.seenVersion) !== tracked.latestVersion && !tracked.trackOnly && tracked.skippedVersion !== tracked.latestVersion;
  const isSkipped = tracked.skippedVersion === tracked.latestVersion;
  
  const latestAssets = app?.latestRelease?.assets?.filter(a => a.status === "VALID") ?? [];
  const primaryAsset = latestAssets[0];
  const downloadHref = primaryAsset ? safeHref(primaryAsset.url) : null;

  return (
    <div className={cn(
      "card overflow-hidden transition-all",
      hasUpdate ? "border-accent/40 bg-accent-soft/20 shadow-glow" : "border-line",
      isSkipped && "opacity-60"
    )}>
      <div className="p-4 flex items-start gap-3">
        <AppIcon name={tracked.name} src={tracked.icon} size="md" className="shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold truncate">{tracked.name}</h3>
                {hasUpdate ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-2xs font-bold text-white">
                    <Zap className="h-3 w-3" />
                    Update
                  </span>
                ) : tracked.trackOnly ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-surface-3 px-2 py-0.5 text-2xs text-muted">
                    <Eye className="h-3 w-3" />
                    Track only
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-2xs font-medium text-success">
                    <Check className="h-3 w-3" />
                    Up to date
                  </span>
                )}
                {tracked.autoUpdate ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-2xs text-accent">
                    Auto
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-muted truncate">{tracked.developer} • {tracked.source}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs font-mono">
                <span className="inline-flex items-center gap-1">
                  <span className="text-subtle">Installed:</span>
                  <span className="font-semibold">{tracked.installedVersion ?? tracked.seenVersion ?? "unknown"}</span>
                </span>
                <span className="text-subtle">→</span>
                <span className="inline-flex items-center gap-1">
                  <span className="text-subtle">Latest:</span>
                  <span className={cn("font-semibold", hasUpdate && "text-accent")}>{tracked.latestVersion ?? "—"}</span>
                </span>
                {tracked.latestReleasedAt ? (
                  <span className="text-2xs text-subtle flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {relativeTime(tracked.latestReleasedAt)}
                  </span>
                ) : null}
              </div>
              {tracked.platforms?.length ? (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {tracked.platforms.slice(0, 3).map(p => (
                    <span key={p} className="rounded-full bg-surface-3 px-1.5 py-0.5 text-2xs">{platformLabel(p)}</span>
                  ))}
                </div>
              ) : null}
            </div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="shrink-0 rounded-full p-2 hover:bg-surface-2 text-muted hover:text-fg"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>

          {/* Direct Download — Obtainium core */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {hasUpdate && downloadHref ? (
              <a
                href={downloadHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-xs font-bold text-white shadow-glow hover:bg-accent-hover hover:-translate-y-0.5 transition-all"
              >
                <Download className="h-4 w-4" />
                Update to v{tracked.latestVersion}
                {primaryAsset?.sizeBytes ? <span className="text-2xs opacity-80">• {formatBytes(primaryAsset.sizeBytes)}</span> : null}
              </a>
            ) : downloadHref ? (
              <a
                href={downloadHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium hover:border-accent/40"
              >
                <Download className="h-3.5 w-3.5" />
                Download v{tracked.latestVersion}
              </a>
            ) : null}
            
            {tracked.slug ? (
              <Link href={`/app/${tracked.slug}`} className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-2/50 px-3 py-1.5 text-xs hover:bg-surface-2">
                <Package className="h-3.5 w-3.5" />
                Details
              </Link>
            ) : null}

            <a href={tracked.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-2/50 px-3 py-1.5 text-xs hover:bg-surface-2">
              <Github className="h-3.5 w-3.5" />
              Source
              <ExternalLink className="h-3 w-3" />
            </a>

            {hasUpdate ? (
              <>
                <button onClick={() => onAcknowledge(tracked.key)} className="inline-flex items-center gap-1 rounded-full bg-success/10 px-3 py-1.5 text-xs font-medium text-success hover:bg-success/20">
                  <Check className="h-3.5 w-3.5" />
                  Mark installed
                </button>
                <button onClick={() => onSkip(tracked.key, tracked.latestVersion)} className="inline-flex items-center gap-1 rounded-full bg-surface-3 px-3 py-1.5 text-xs text-muted hover:text-fg">
                  <X className="h-3.5 w-3.5" />
                  Skip v{tracked.latestVersion}
                </button>
              </>
            ) : null}
          </div>

          {/* Release assets preview */}
          {latestAssets.length > 0 ? (
            <div className="mt-3">
              <button onClick={() => setShowReleases(!showReleases)} className="flex items-center gap-1 text-xs text-muted hover:text-fg">
                <span>{latestAssets.length} assets • Direct from {tracked.source}</span>
                <ChevronDown className={cn("h-3 w-3 transition-transform", showReleases && "rotate-180")} />
              </button>
              {showReleases ? (
                <div className="mt-2 grid gap-1.5">
                  {latestAssets.slice(0, 5).map(asset => {
                    const href = safeHref(asset.url);
                    if (!href) return null;
                    return (
                      <a key={asset.id} href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg border border-line bg-surface-2/30 px-2.5 py-1.5 text-xs hover:border-accent/30">
                        <Download className="h-3 w-3 text-muted" />
                        <span className="font-medium">{packageTypeLabel(asset.packageType)}</span>
                        {asset.architecture ? <span className="rounded bg-surface-3 px-1 py-0.5 font-mono text-2xs">{asset.architecture}</span> : null}
                        {asset.sizeBytes ? <span className="text-2xs text-muted">{formatBytes(asset.sizeBytes)}</span> : null}
                        <span className="ml-auto text-2xs text-accent">Get →</span>
                      </a>
                    );
                  })}
                  {app?.releases && app.releases.length > 1 && tracked.allowDowngrade ? (
                    <div className="pt-2 border-t border-line/50">
                      <p className="text-2xs font-semibold text-muted mb-1">Previous releases (rollback):</p>
                      {app.releases.slice(1, 4).map(rel => (
                        <div key={rel.version} className="flex items-center gap-2 text-2xs text-muted">
                          <RotateCcw className="h-3 w-3" />
                          <span>v{rel.version}</span>
                          {rel.releasedAt ? <span>• {relativeTime(rel.releasedAt)}</span> : null}
                          {rel.assets[0] ? (
                            <a href={safeHref(rel.assets[0].url) ?? "#"} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline ml-auto">Download</a>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* Per-app settings — Obtainium style */}
      {showSettings ? (
        <div className="border-t border-line bg-surface-2/30 p-4 space-y-3">
          <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
            <Settings className="h-3.5 w-3.5" />
            Per-App Settings — Obtainium Style
          </h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface p-2.5">
              <span className="flex items-center gap-2 text-xs">
                <Zap className="h-3.5 w-3.5 text-accent" />
                Auto-update
              </span>
              <input type="checkbox" checked={tracked.autoUpdate} onChange={e => onUpdate(tracked.key, { autoUpdate: e.target.checked })} className="rounded" />
            </label>
            <label className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface p-2.5">
              <span className="flex items-center gap-2 text-xs">
                <Bell className="h-3.5 w-3.5 text-accent" />
                Include pre-releases
              </span>
              <input type="checkbox" checked={tracked.includePrerelease} onChange={e => onUpdate(tracked.key, { includePrerelease: e.target.checked })} className="rounded" />
            </label>
            <label className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface p-2.5">
              <span className="flex items-center gap-2 text-xs">
                <EyeOff className="h-3.5 w-3.5 text-muted" />
                Track only (no notify)
              </span>
              <input type="checkbox" checked={tracked.trackOnly} onChange={e => onUpdate(tracked.key, { trackOnly: e.target.checked })} className="rounded" />
            </label>
            <label className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface p-2.5">
              <span className="flex items-center gap-2 text-xs">
                <RotateCcw className="h-3.5 w-3.5 text-muted" />
                Allow downgrade / rollback
              </span>
              <input type="checkbox" checked={tracked.allowDowngrade} onChange={e => onUpdate(tracked.key, { allowDowngrade: e.target.checked })} className="rounded" />
            </label>
            <label className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface p-2.5">
              <span className="flex items-center gap-2 text-xs">
                <Wifi className="h-3.5 w-3.5 text-muted" />
                Wi-Fi only
              </span>
              <input type="checkbox" checked={tracked.wifiOnly} onChange={e => onUpdate(tracked.key, { wifiOnly: e.target.checked })} className="rounded" />
            </label>
            <label className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface p-2.5">
              <span className="flex items-center gap-2 text-xs">
                <BatteryCharging className="h-3.5 w-3.5 text-muted" />
                Charging only
              </span>
              <input type="checkbox" checked={tracked.chargingOnly} onChange={e => onUpdate(tracked.key, { chargingOnly: e.target.checked })} className="rounded" />
            </label>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium">Installed version (Obtainium: version on device)</label>
            <div className="flex gap-2">
              <input
                value={tracked.installedVersion ?? ""}
                onChange={e => onUpdate(tracked.key, { installedVersion: e.target.value || null })}
                placeholder="e.g. 2.4.1"
                className="flex-1 rounded-full border border-line bg-surface px-3 py-2 text-xs font-mono"
              />
              <button onClick={() => tracked.latestVersion && onSetInstalled(tracked.key, tracked.latestVersion)} className="rounded-full bg-surface-3 px-3 py-2 text-xs">
                Set to latest
              </button>
            </div>
            <p className="text-2xs text-muted">Tell OmniStore what version you have installed — like Obtainium reads version from device. Updates are calculated from this.</p>
          </div>

          {tracked.skippedVersion ? (
            <div className="flex items-center justify-between rounded-xl bg-warning/10 border border-warning/20 px-3 py-2">
              <span className="text-xs">Skipped v{tracked.skippedVersion}</span>
              <button onClick={() => onSkip(tracked.key, null)} className="text-xs text-accent hover:underline">Unskip</button>
            </div>
          ) : null}

          <div className="flex gap-2 pt-2">
            <button onClick={() => onUntrack(tracked.key)} className="rounded-full border border-danger/30 bg-danger/10 px-4 py-2 text-xs font-medium text-danger hover:bg-danger/20">
              Stop tracking
            </button>
            <button onClick={() => setShowSettings(false)} className="rounded-full border border-line bg-surface px-4 py-2 text-xs">
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
