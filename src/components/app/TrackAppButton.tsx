"use client";

import { useState } from "react";
import { Download, Check, Bell, Zap } from "lucide-react";
import { useTracked } from "@/lib/track/use-tracked";
import type { App } from "@omnistore/shared-models";
import { cn } from "@/lib/utils";

export function TrackAppButton({ app }: { app: App }) {
  const { track, untrack, isTracked, loaded } = useTracked();
  const [loading, setLoading] = useState(false);
  const tracked = loaded ? isTracked(app.id, app.repository ?? undefined) : false;

  const handleTrack = async () => {
    setLoading(true);
    try {
      if (tracked) {
        await untrack(app.id);
      } else {
        await track({
          appId: app.id,
          slug: app.slug,
          name: app.name,
          sourceUrl: app.repository ?? `https://github.com/${app.bundleId}`,
          source: "github",
          icon: app.icon,
          developer: app.developer,
          platforms: app.platforms ?? [],
          version: app.version,
          releasedAt: app.latestRelease?.releasedAt ?? null,
          pending: false,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleTrack}
      disabled={loading || !loaded}
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all",
        tracked
          ? "bg-success/10 border border-success/20 text-success hover:bg-success/20"
          : "bg-accent text-white hover:bg-accent-hover shadow-glow hover:-translate-y-0.5"
      )}
    >
      {tracked ? (
        <>
          <Check className="h-4 w-4" />
          Tracking — Direct updates
        </>
      ) : (
        <>
          <Bell className="h-4 w-4" />
          Track — Get direct updates
        </>
      )}
    </button>
  );
}

export function DirectUpdateButton({ app }: { app: App }) {
  const validAssets = app.latestRelease?.assets?.filter(a => a.status === "VALID") ?? [];
  const primary = validAssets[0];
  if (!primary) return null;

  return (
    <a
      href={primary.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-accent to-accent-2 px-5 py-2.5 text-sm font-bold text-white shadow-glow hover:-translate-y-0.5 transition-all"
    >
      <Download className="h-4 w-4" />
      Direct Update to v{app.version ?? primary.version}
      <Zap className="h-3.5 w-3.5 opacity-80" />
    </a>
  );
}
