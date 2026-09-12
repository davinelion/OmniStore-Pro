"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Bell, BellOff, Check, Loader2 } from "lucide-react";

import type { Platform } from "@omnistore/shared-models";
import type { SourceId } from "@/lib/sources";
import { useTracked } from "@/lib/track/use-tracked";
import { cn } from "@/lib/utils";

/**
 * Track / untrack this source.
 *
 * Tracking records the version the user is aware of, so the update inbox can
 * diff it against whatever OmniSource reports later. Fully local — no account.
 */
export function TrackButton({
  appId,
  slug,
  name,
  sourceUrl,
  source,
  icon,
  developer,
  platforms,
  version,
  releasedAt,
  withLabel = true,
  className,
}: {
  appId: string;
  slug: string;
  name: string;
  sourceUrl: string;
  source: SourceId;
  icon: string | null;
  developer: string;
  platforms: Platform[];
  version: string | null;
  releasedAt: string | null;
  withLabel?: boolean;
  className?: string;
}) {
  const t = useTranslations("track");
  const { loaded, track, untrack, isTracked } = useTracked();
  const [pending, setPending] = useState(false);

  const tracked = isTracked(appId, sourceUrl);

  async function onClick() {
    if (pending) return;
    setPending(true);
    try {
      if (tracked) {
        await untrack(appId);
      } else {
        await track({
          appId,
          slug,
          name,
          sourceUrl,
          source,
          icon,
          developer,
          platforms,
          version,
          releasedAt,
          pending: false,
        });
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void onClick()}
      disabled={!loaded || pending}
      aria-pressed={tracked}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors disabled:opacity-60",
        tracked
          ? "border border-accent/40 bg-accent/10 text-accent"
          : "border border-line bg-surface-2/60 text-fg hover:border-accent/50",
        !withLabel && "w-9 px-0",
        className,
      )}
      title={tracked ? t("stopTracking") : t("submit")}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : tracked ? (
        <Check className="h-4 w-4" aria-hidden />
      ) : (
        <Bell className="h-4 w-4" aria-hidden />
      )}
      {withLabel ? (
        <span>{tracked ? t("upToDate") : t("submit")}</span>
      ) : (
        <span className="sr-only">{tracked ? t("stopTracking") : t("submit")}</span>
      )}
      <span className="sr-only" aria-hidden>
        <BellOff />
      </span>
    </button>
  );
}
