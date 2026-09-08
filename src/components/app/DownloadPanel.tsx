"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, ExternalLink, ShieldAlert, ShieldCheck } from "lucide-react";

import type { App, Asset, Platform } from "@/lib/schemas/omnisource";
import { assetStatusNote, isDownloadableAsset } from "@/lib/schemas/omnisource";
import { architectureLabel, downloadLabel, formatBytes, NOT_AVAILABLE, packageTypeLabel, platformLabel } from "@/lib/formatters";
import { PLATFORM_INFO, platformInfo } from "@/config/site";
import { safeHref } from "@/lib/security/urls";
import { detectPlatform } from "@/lib/platform/detect";
import { BrowserDownloadInstaller } from "@/lib/platform/installers";
import { Badge } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

/**
 * Platform-aware download panel.
 *
 * Only assets OmniSource reports as VALID become download buttons. Anything
 * else is shown with its real status, never as an ordinary download.
 */
export function DownloadPanel({ app }: { app: App }) {
  const release = app.latest_release;
  const assets = useMemo(() => release?.assets ?? [], [release]);

  const platforms = useMemo(
    () => PLATFORM_INFO.filter((p) => assets.some((a) => a.platform === p.slug)).map((p) => p.slug),
    [assets],
  );

  const [selected, setSelected] = useState<Platform | "all">("all");
  const [detected, setDetected] = useState<Platform | null>(null);

  // Pre-select the visitor's platform once, after hydration, without hiding
  // the other choices.
  useEffect(() => {
    const guess = detectPlatform();
    if (guess && platforms.includes(guess)) {
      setSelected(guess);
      setDetected(guess);
    }
  }, [platforms]);

  const visible = useMemo(
    () => (selected === "all" ? assets : assets.filter((a) => a.platform === selected)),
    [assets, selected],
  );

  if (!release || assets.length === 0) {
    return (
      <section id="get" className="card p-5">
        <h2 className="text-lg font-semibold">Get App</h2>
        <p className="mt-2 text-sm text-muted">
          No packages are published for the current release. Browse the{" "}
          <a className="text-accent hover:underline" href={safeHref(app.links.releases) ?? "#"}>
            upstream releases
          </a>{" "}
          for other options.
        </p>
      </section>
    );
  }

  const selectedInfo = selected === "all" ? null : platformInfo(selected);

  return (
    <section id="get" className="card scroll-mt-24 p-5" aria-labelledby="get-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="get-heading" className="text-lg font-semibold">
          Get App
        </h2>
        {release.version ? <Badge tone="accent">v{release.version}</Badge> : null}
      </div>

      <p className="mt-2 text-sm text-muted">
        OmniStore will open the upstream download. Installation is handled by your operating system.
      </p>

      <div
        role="radiogroup"
        aria-label="Choose your platform"
        className="mt-4 flex flex-wrap gap-1.5 rounded-xl border border-line bg-surface-2 p-1"
      >
        <PlatformOption active={selected === "all"} onClick={() => setSelected("all")} label="All" />
        {platforms.map((platform) => (
          <PlatformOption
            key={platform}
            active={selected === platform}
            onClick={() => setSelected(platform)}
            label={platformLabel(platform)}
            detected={detected === platform}
          />
        ))}
      </div>

      {selectedInfo ? (
        <p className="mt-3 text-sm text-muted">
          <span className="font-medium text-fg">{selectedInfo.installMethods.join(" / ")}</span> —{" "}
          {selectedInfo.handoff}
        </p>
      ) : null}

      <ul className="mt-4 space-y-3">
        {visible.length === 0 ? (
          <li className="text-sm text-muted">No compatible packages for this selection.</li>
        ) : (
          visible.map((asset) => <AssetRow key={asset.id} asset={asset} app={app} />)
        )}
      </ul>
    </section>
  );
}

function PlatformOption({
  active,
  onClick,
  label,
  detected,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  detected?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "rounded-lg px-3 py-1.5 text-sm transition-colors",
        active ? "bg-surface text-fg shadow-card" : "text-fg-muted hover:text-fg",
      )}
    >
      {label}
      {detected ? <span className="ml-1 text-2xs text-accent">detected</span> : null}
    </button>
  );
}

function AssetRow({ asset, app }: { asset: Asset; app: App }) {
  const downloadable = isDownloadableAsset(asset);
  const href = safeHref(asset.url);
  const installable = downloadable && href && BrowserDownloadInstaller.canInstall(asset);
  const label = downloadLabel(asset);
  const status = asset.status;

  return (
    <li className="rounded-xl border border-line bg-surface-2/40 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {platformLabel(asset.platform)} · {packageTypeLabel(asset.package_type)}
          </p>
          <p className="mt-0.5 text-2xs text-fg-subtle">
            {architectureLabel(asset.architecture)}
            {asset.size_bytes != null ? ` · ${formatBytes(asset.size_bytes)}` : ` · ${NOT_AVAILABLE} size`}
            {asset.version ? ` · v${asset.version}` : ""}
          </p>
        </div>
        {status === "VALID" ? (
          <Badge tone="success">
            <ShieldCheck className="h-3 w-3" aria-hidden />
            Verified
          </Badge>
        ) : (
          <Badge tone={status === "UNKNOWN" ? "neutral" : "warning"}>
            <ShieldAlert className="h-3 w-3" aria-hidden />
            {status === "UNKNOWN" ? "Verification unavailable" : status.replace(/_/g, " ").toLowerCase()}
          </Badge>
        )}
      </div>

      <dl className="mt-2 grid gap-x-4 text-2xs text-fg-subtle sm:grid-cols-2">
        <div className="flex justify-between gap-2">
          <dt>Version</dt>
          <dd className="truncate font-medium text-fg-muted">{asset.version}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Architecture</dt>
          <dd className="font-medium text-fg-muted">{architectureLabel(asset.architecture)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Size</dt>
          <dd className="font-medium text-fg-muted">{formatBytes(asset.size_bytes)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>SHA-256</dt>
          <dd className="truncate font-medium text-fg-muted" title={asset.sha256 ?? undefined}>
            {asset.sha256 ?? "Not published upstream"}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Source</dt>
          <dd className="truncate font-medium text-fg-muted">{asset.source ?? NOT_AVAILABLE}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Status</dt>
          <dd className="font-medium text-fg-muted">{assetStatusNote(asset)}</dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {installable && href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer external"
            className="inline-flex h-9 items-center gap-2 rounded-full bg-accent px-4 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
            data-app-id={app.id}
            data-asset-id={asset.id}
          >
            <Download className="h-4 w-4" aria-hidden />
            {label}
          </a>
        ) : (
          <p className="text-xs text-fg-muted">
            {status === "UNKNOWN"
              ? "Verification unavailable — this package is not offered as a download."
              : "This package is not offered as a normal download."}
          </p>
        )}

        {safeHref(app.links.releases) ? (
          <a
            href={safeHref(app.links.releases)}
            target="_blank"
            rel="noopener noreferrer external"
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-xs text-fg-muted transition-colors hover:text-fg"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            View release page
          </a>
        ) : null}
      </div>
    </li>
  );
}
