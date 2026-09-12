"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Download, ExternalLink, ShieldCheck, ShieldQuestion, ShieldAlert } from "lucide-react";

import type { App, Architecture, Platform, ReleaseAsset } from "@omnistore/shared-models";
import { architectureLabel, formatBytes, packageTypeLabel, platformLabel } from "@/lib/formatters";
import { safeHref } from "@/lib/security/urls";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics/client";

/**
 * InstallPanel — platform-aware download hand-off.
 *
 * Only assets OmniSource validated as VALID are offered as downloads. Every
 * other validation status is shown with its real state; sizes, architectures
 * and checksums come straight from the API. OmniStore never mirrors binaries.
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

  if (!release || assets.length === 0) {
    return (
      <div className="card space-y-3 p-4">
        <h2 className="text-sm font-semibold">{t("install")}</h2>
        <p className="text-sm text-muted">{t("noAssets")}</p>
        {app.repository ? (
          <a
            href={safeHref(app.repository)}
            target="_blank"
            rel="noopener noreferrer external"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            {t("repository")}
          </a>
        ) : null}
      </div>
    );
  }

  const visible = assets.filter((asset) => asset.platform === platform);
  const groups = groupByArchitecture(visible);

  return (
    <div className="card space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">
          {t("install")} {release.version ? <span className="text-muted">· v{release.version}</span> : null}
        </h2>
        {release.hasBreakingChanges ? (
          <span className="rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-2xs font-medium text-warning">
            {t("breakingChanges")}
          </span>
        ) : null}
      </div>

      {platforms.length > 1 ? (
        <div role="tablist" aria-label={t("platforms")} className="flex flex-wrap gap-1.5">
          {platforms.map((candidate) => (
            <button
              key={candidate}
              type="button"
              role="tab"
              aria-selected={candidate === platform}
              onClick={() => setPlatform(candidate)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                candidate === platform
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-line bg-surface text-muted hover:border-accent/40 hover:text-fg",
              )}
            >
              {platformLabel(candidate)}
            </button>
          ))}
        </div>
      ) : null}

      <ul className="space-y-2">
        {groups.map(([architecture, groupAssets]) => (
          <li key={architecture ?? "any"} className="space-y-1.5">
            {groups.length > 1 ? (
              <p className="text-2xs font-semibold uppercase tracking-wide text-subtle">
                {architecture ? architectureLabel(architecture) : "Any"}
              </p>
            ) : null}
            {groupAssets.map((asset) => (
              <AssetRow key={asset.id} appId={app.id} asset={asset} handoff={t("installHandoff")} downloadLabel={t("download")} />
            ))}
          </li>
        ))}
      </ul>

      <p className="text-2xs leading-relaxed text-subtle">{t("installHandoff")}</p>
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
    <div className="flex items-center gap-3 rounded-xl border border-line px-3 py-2">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">
          {packageTypeLabel(asset.packageType)}
          {asset.sizeBytes != null ? (
            <span className="ms-2 text-xs font-normal text-muted">{formatBytes(asset.sizeBytes)}</span>
          ) : null}
        </span>
        <span className="flex items-center gap-1.5 text-2xs text-subtle">
          {icon}
          <span>{valid ? "Validated" : t("scanStatus") + ": " + asset.status}</span>
          {asset.sha256 ? (
            <span className="hidden font-mono sm:inline" title={`sha256:${asset.sha256}`}>
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
          onClick={() => trackEvent({ type: "download_click", appId, metadata: { packageType: asset.packageType } })}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-fg transition-colors hover:bg-accent-hover"
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
          {downloadLabel}
        </a>
      ) : (
        <span className="shrink-0 rounded-full bg-surface-3 px-2.5 py-1 text-2xs text-muted">
          {asset.status}
        </span>
      )}
    </div>
  );
}
