"use client";

import { useMemo, useState } from "react";
import type { App, Asset, Platform } from "@/lib/schemas/omnisource";
import { formatBytes, platformLabel } from "@/lib/utils";
import { isSafeUrl } from "@/lib/security/urls";
import { BrowserDownloadInstaller } from "@/lib/platform/installers";

const INSTALL: Record<string, string> = {
  ios: "Installation method: IPA / supported source. OmniStore cannot install iOS apps from the browser.",
  ipados: "Installation method: IPA / supported source.",
  android: "Installation method: APK. Your device handles installation after download.",
  windows: "Installation method: EXE / MSIX.",
  macos: "Installation method: DMG / PKG.",
  linux: "Installation method: AppImage / DEB / RPM / Flatpak.",
};

export function DownloadPanel({ app }: { app: App }) {
  const assets = app.latest_release?.assets ?? [];
  const platforms = Array.from(new Set(assets.map((a) => a.platform)));
  const [platform, setPlatform] = useState<Platform | "">(platforms[0] ?? "");
  const filtered = useMemo(
    () => assets.filter((a) => (!platform || a.platform === platform) && a.status !== "INVALID" && a.status !== "QUARANTINED"),
    [assets, platform]
  );

  return (
    <section id="get" className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5">
      <h2 className="font-display text-lg font-semibold">Get App</h2>
      <p className="mt-2 text-sm text-[var(--muted)]">
        OmniStore will open the upstream download. Installation is handled by your operating system.
      </p>
      {platforms.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Choose your platform">
          {platforms.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPlatform(p)}
              className={`rounded-full px-3 py-1 text-sm ${platform === p ? "bg-accent text-white" : "border border-[var(--line)]"}`}
            >
              {platformLabel(p)}
            </button>
          ))}
        </div>
      )}
      {platform && <p className="mt-3 text-sm">{INSTALL[platform]}</p>}
      <ul className="mt-4 space-y-3">
        {filtered.length === 0 && <li className="text-sm text-[var(--muted)]">No compatible packages for this selection.</li>}
        {filtered.map((asset) => (
          <AssetRow key={asset.id} asset={asset} />
        ))}
      </ul>
    </section>
  );
}

function AssetRow({ asset }: { asset: Asset }) {
  const safe = isSafeUrl(asset.url);
  const valid = asset.status === "VALID";
  const unknown = asset.status === "UNKNOWN" || asset.status === "REVIEW_REQUIRED";
  const can = valid && safe && BrowserDownloadInstaller.canInstall(asset);
  const label = `Download ${platformLabel(asset.platform)} ${asset.package_type} — ${asset.architecture}`;
  return (
    <li className="rounded-xl border border-[var(--line)] p-3 text-sm">
      <p className="font-medium">{label}</p>
      <dl className="mt-2 grid grid-cols-2 gap-1 text-[var(--muted)] md:grid-cols-3">
        <div>Version: {asset.version}</div>
        <div>Architecture: {asset.architecture}</div>
        <div>Size: {formatBytes(asset.size_bytes)}</div>
        <div>SHA-256: {asset.sha256 ?? "Not available"}</div>
        <div>Source: {asset.source ?? "Not available"}</div>
        <div>Status: {unknown ? "Verification unavailable" : asset.status}</div>
      </dl>
      {can ? (
        <a
          href={asset.url}
          className="mt-3 inline-block rounded-full bg-accent px-4 py-2 text-white"
          rel="noreferrer noopener"
        >
          {label}
        </a>
      ) : (
        <p className="mt-3 text-[var(--muted)]">
          {unknown ? "Verification unavailable" : "This package is not offered as a normal download."}
        </p>
      )}
    </li>
  );
}
