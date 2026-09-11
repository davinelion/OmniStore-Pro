"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Download } from "lucide-react";

import type { App, TrustBadge } from "@omnistore/shared-models";
import { formatCompactNumber, relativeTime } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { AppIcon } from "./AppIcon";
import { TrustBadgeList } from "./TrustBadges";
import { PlatformBadgeRow } from "@/components/platform/PlatformBadges";

export type AppCardLayout = "grid" | "list" | "compact" | "hero";

/**
 * The AppCard — one card, four layouts, used on every surface (home,
 * search, collections, category, developer, library). Sizing is explicit at
 * every breakpoint so rows never shift or overflow.
 */
export function AppCard({
  app,
  layout = "grid",
  badges = [],
  showScores = true,
  priority = false,
  className,
}: {
  app: App;
  layout?: AppCardLayout;
  /** Pre-fetched trust badges (server components pass these in). */
  badges?: readonly TrustBadge[];
  showScores?: boolean;
  priority?: boolean;
  className?: string;
}) {
  const t = useTranslations("app");
  const href = `/app/${app.slug}`;

  if (layout === "compact") {
    return (
      <Link
        href={href}
        className={cn(
          "group flex items-center gap-3 rounded-xl border border-transparent p-2 transition-colors hover:border-line hover:bg-surface-2",
          className,
        )}
      >
        <AppIcon name={app.name} src={app.icon} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium group-hover:text-accent">
            {app.name}
          </span>
          <span className="block truncate text-xs text-muted">
            {app.shortDescription ?? app.developer}
          </span>
        </span>
        {showScores && app.trustScore != null ? (
          <span className="text-xs tabular-nums text-muted" title={t("trustScore")}>
            {app.trustScore}
          </span>
        ) : null}
      </Link>
    );
  }

  if (layout === "list") {
    return (
      <Link
        href={href}
        className={cn(
          "card card-interactive flex items-center gap-4 p-3 hover:shadow-card sm:p-4",
          className,
        )}
      >
        <AppIcon name={app.name} src={app.icon} size="lg" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-base font-semibold">{app.name}</span>
            <TrustBadgeList badges={badges} size="sm" />
          </span>
          <span className="mt-0.5 line-clamp-2 block text-sm text-muted">
            {app.shortDescription || app.description || t("notAvailable")}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-subtle">
            <PlatformBadgeRow platforms={app.platforms ?? []} />
            {app.updatedAt ? <span>{relativeTime(app.updatedAt)}</span> : null}
            {app.version ? <span>v{app.version}</span> : null}
          </span>
        </span>
      </Link>
    );
  }

  if (layout === "hero") {
    return (
      <Link
        href={href}
        className={cn(
          "card card-interactive group relative flex min-h-[15rem] flex-col justify-end overflow-hidden p-5 hover:shadow-card sm:min-h-[17rem] sm:p-6",
          className,
        )}
      >
        {app.banner ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={app.banner}
            alt=""
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover opacity-25 transition-opacity group-hover:opacity-35"
          />
        ) : null}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-surface via-surface/85 to-surface/30"
        />
        <div className="relative flex items-end gap-4">
          <AppIcon name={app.name} src={app.icon} size="xl" />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-lg font-semibold sm:text-xl">{app.name}</h3>
            <p className="mt-0.5 line-clamp-2 text-sm text-muted">
              {app.shortDescription || app.description}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <TrustBadgeList badges={badges} size="sm" />
              <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface/70 px-2 py-0.5 text-2xs text-muted">
                <Download className="h-3 w-3" aria-hidden />
                {app.downloadCount != null
                  ? formatCompactNumber(app.downloadCount)
                  : app.version ?? ""}
              </span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // grid (default)
  return (
    <Link
      href={href}
      className={cn(
        "card card-interactive flex flex-col gap-3 p-4 hover:shadow-card",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <AppIcon name={app.name} src={app.icon} size="lg" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[0.95rem] font-semibold leading-snug">{app.name}</h3>
          <p className="truncate text-xs text-muted">{app.developer}</p>
        </div>
      </div>
      <p className="line-clamp-2 min-h-[2.4em] text-sm text-muted">
        {app.shortDescription || app.description || t("notAvailable")}
      </p>
      <div className="mt-auto flex items-center justify-between gap-2">
        <TrustBadgeList badges={badges} size="sm" />
        {showScores && app.trustScore != null ? (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-2xs font-semibold tabular-nums",
              app.trustScore >= 80
                ? "bg-success/10 text-success"
                : app.trustScore >= 50
                  ? "bg-warning/10 text-warning"
                  : "bg-surface-3 text-muted",
            )}
          >
            {app.trustScore}
          </span>
        ) : null}
      </div>
    </Link>
  );
}

/** Responsive grid of AppCards with stable sizing (no CLS). */
export function AppGrid({
  apps,
  className,
}: {
  apps: App[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        className,
      )}
    >
      {apps.map((app) => (
        <AppCard key={app.id} app={app} />
      ))}
    </div>
  );
}
