import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";

import type { App } from "@/lib/schemas/omnisource";
import { cn } from "@/lib/utils";
import { freshnessLabel, NOT_AVAILABLE, packageTypeLabel } from "@/lib/formatters";
import { AppIcon } from "./AppIcon";
import { PlatformBadge } from "@/components/platform/PlatformBadge";
import { FavoriteButton } from "./LocalActions";
import { categoryName } from "@/config/site";

/**
 * The canonical app summary card.
 *
 * Deliberately restrained: icon, identity, one line of description, platform
 * availability and a single primary action. No fake ratings, no counters we
 * cannot measure.
 */
export function AppCard({ app, className }: { app: App; className?: string }) {
  const summary = app.summary ?? "Description unavailable";
  const updated = freshnessLabel(app.updated_at);
  const primaryCategory = app.categories[0];

  return (
    <article
      className={cn(
        "card card-interactive group relative flex flex-col gap-3 p-4 focus-within:border-accent/60",
        className,
      )}
    >
      <div className="flex gap-3">
        <AppIcon name={app.name} src={app.icon_url} size="md" />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate font-semibold leading-tight">
              {/* Stretched link: the whole card is clickable, actions stay reachable. */}
              <Link href={`/apps/${app.slug}`} className="after:absolute after:inset-0 focus:outline-none">
                {app.name}
              </Link>
            </h3>
            {app.scores.trust.value != null ? (
              <span
                className="relative z-10 inline-flex shrink-0 items-center gap-1 rounded-full border border-line px-1.5 py-0.5 text-2xs text-fg-muted"
                title={`Trust Score ${app.scores.trust.value} / 100`}
              >
                <ShieldCheck className="h-3 w-3 text-accent" aria-hidden />
                <span className="tabular-nums">{app.scores.trust.value}</span>
                <span className="sr-only">Trust Score {app.scores.trust.value} out of 100</span>
              </span>
            ) : null}
          </div>

          <p className="mt-1 line-clamp-2 text-sm text-muted">{summary}</p>

          <p className="mt-1.5 truncate text-2xs text-fg-subtle">
            {primaryCategory ? categoryName(primaryCategory) : "Uncategorized"}
            {app.latest_release?.version ? ` · v${app.latest_release.version}` : ""}
            {updated ? ` · ${updated}` : ""}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        {app.platforms.slice(0, 6).map((platform) => (
          <PlatformBadge key={platform} platform={platform} />
        ))}
        {app.platforms.length > 6 ? (
          <span className="chip">+{app.platforms.length - 6}</span>
        ) : null}
      </div>

      {/* Desktop affordances. On mobile the whole card is the tap target. */}
      <div className="mt-auto hidden gap-2 pt-1 md:flex">
        <Link
          href={`/apps/${app.slug}`}
          className="relative z-10 inline-flex h-8 items-center gap-1 rounded-full border border-line px-3 text-sm transition-colors hover:bg-surface-2"
        >
          View
        </Link>
        <Link
          href={`/apps/${app.slug}#get`}
          className="relative z-10 inline-flex h-8 items-center gap-1 rounded-full bg-accent px-3 text-sm text-accent-fg transition-colors hover:bg-accent-hover"
        >
          Get
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
        <FavoriteButton appId={app.id} name={app.name} className="ml-auto" />
      </div>
    </article>
  );
}

/** Compact row used in compare pickers, search suggestions and sidebars. */
export function AppRow({ app, action }: { app: App; action?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-2.5">
      <AppIcon name={app.name} src={app.icon_url} size="sm" />
      <div className="min-w-0 flex-1">
        <Link href={`/apps/${app.slug}`} className="truncate text-sm font-medium hover:text-accent">
          {app.name}
        </Link>
        <p className="truncate text-2xs text-fg-subtle">
          {app.platforms.length} platforms
          {app.latest_release ? ` · ${packageTypeLabel(app.latest_release.assets[0]?.package_type ?? "OTHER")}` : ""}
          {app.scores.trust.value != null ? ` · Trust ${app.scores.trust.value}` : ""}
        </p>
      </div>
      {action}
    </div>
  );
}

export function AppList({ apps, empty }: { apps: App[]; empty?: React.ReactNode }) {
  if (apps.length === 0 && empty) return <>{empty}</>;
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {apps.map((app) => (
        <AppCard key={app.id} app={app} />
      ))}
    </div>
  );
}

export function StatLine({ app }: { app: App }) {
  return (
    <span>{app.signals.stars == null ? NOT_AVAILABLE : `${app.signals.stars.toLocaleString("en-US")} stars`}</span>
  );
}
