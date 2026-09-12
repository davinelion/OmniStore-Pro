"use client";

import Link from "next/link";
import { useRef } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";

import { ShieldCheck } from "lucide-react";

import type { App, Collection, CollectionLayout } from "@omnistore/shared-models";
import type { TrustBadge } from "@omnistore/shared-models";
import { cn } from "@/lib/utils";
import { AppCard } from "@/components/app/AppCard";
import { AppIcon } from "@/components/app/AppIcon";
import { TrustBadgeList } from "@/components/app/TrustBadges";
import { PlatformBadgeRow } from "@/components/platform/PlatformBadges";
import { SectionHeading } from "@/components/ui/primitives";

/**
 * CollectionSection — the reusable homepage/browse section.
 *
 * Props: title, description, apps, layout. Layouts: hero | carousel | grid |
 * list | compact. Every layout is responsive and fixed-height per row, so
 * swapping layouts cannot cause layout shift.
 */
export function CollectionSection({
  title,
  description,
  apps,
  layout = "carousel",
  badgesByAppId,
  moreHref,
  moreLabel,
  icon,
}: {
  title: string;
  description?: string | null;
  apps: App[];
  layout?: CollectionLayout;
  badgesByAppId?: ReadonlyMap<string, readonly TrustBadge[]>;
  moreHref?: string;
  moreLabel?: string;
  icon?: React.ReactNode;
}) {
  const t = useTranslations("common");
  if (apps.length === 0) return null;

  return (
    <section aria-labelledby={`section-${slug(title)}`} className="space-y-4">
      <SectionHeading
        id={`section-${slug(title)}`}
        title={
          <span className="inline-flex items-center gap-2">
            {icon}
            {title}
          </span>
        }
        description={description ?? undefined}
        action={
          moreHref ? (
            <Link
              href={moreHref}
              className="text-sm font-medium text-accent hover:underline"
            >
              {moreLabel ?? t("seeMore")}
            </Link>
          ) : null
        }
      />
      <CollectionLayoutView
        apps={apps}
        layout={layout}
        badgesByAppId={badgesByAppId}
      />
    </section>
  );
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function CollectionLayoutView({
  apps,
  layout,
  badgesByAppId,
}: {
  apps: App[];
  layout: CollectionLayout;
  badgesByAppId?: ReadonlyMap<string, readonly TrustBadge[]>;
}) {
  switch (layout) {
    case "hero":
      return <HeroLayout apps={apps} badgesByAppId={badgesByAppId} />;
    case "ranked":
      return <RankedLayout apps={apps} badgesByAppId={badgesByAppId} />;
    case "grid":
      return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {apps.map((app) => (
            <AppCard
              key={app.id}
              app={app}
              badges={badgesByAppId?.get(app.id) ?? []}
            />
          ))}
        </div>
      );
    case "list":
      return (
        <div className="space-y-2">
          {apps.map((app) => (
            <AppCard
              key={app.id}
              app={app}
              layout="list"
              badges={badgesByAppId?.get(app.id) ?? []}
            />
          ))}
        </div>
      );
    case "compact":
      return (
        <div className="card divide-y divide-line p-1">
          {apps.map((app) => (
            <AppCard key={app.id} app={app} layout="compact" />
          ))}
        </div>
      );
    case "carousel":
    default:
      return <CarouselLayout apps={apps} badgesByAppId={badgesByAppId} />;
  }
}

function CarouselLayout({
  apps,
  badgesByAppId,
}: {
  apps: App[];
  badgesByAppId?: ReadonlyMap<string, readonly TrustBadge[]>;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const t = useTranslations("common");

  function scrollBy(direction: 1 | -1) {
    const node = scroller.current;
    if (!node) return;
    node.scrollBy({ left: direction * Math.max(280, node.clientWidth * 0.8), behavior: "smooth" });
  }

  return (
    <div className="relative">
      <div
        ref={scroller}
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0"
        role="region"
        aria-label="carousel"
      >
        {apps.map((app) => (
          <div
            key={app.id}
            className="w-[16.5rem] shrink-0 snap-start sm:w-[17.5rem]"
          >
            <AppCard app={app} badges={badgesByAppId?.get(app.id) ?? []} />
          </div>
        ))}
      </div>
      {apps.length > 3 ? (
        <div className="pointer-events-none absolute -top-14 right-0 hidden items-center gap-1 sm:flex">
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            aria-label={t("seeMore")}
            className="pointer-events-auto rounded-full border border-line bg-surface p-1.5 text-muted transition-colors hover:border-accent/50 hover:text-fg"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            aria-label={t("seeMore")}
            className="pointer-events-auto rounded-full border border-line bg-surface p-1.5 text-muted transition-colors hover:border-accent/50 hover:text-fg"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function HeroLayout({
  apps,
  badgesByAppId,
}: {
  apps: App[];
  badgesByAppId?: ReadonlyMap<string, readonly TrustBadge[]>;
}) {
  const [lead, ...rest] = apps;
  if (!lead) return null;
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <AppCard app={lead} layout="hero" badges={badgesByAppId?.get(lead.id) ?? []} priority />
      <div className="grid gap-3 sm:grid-cols-2">
        {rest.slice(0, 4).map((app) => (
          <AppCard key={app.id} app={app} />
        ))}
      </div>
    </div>
  );
}

/**
 * RankedLayout — editorial "chart" rows with oversized ghost numerals.
 *
 * Used for Trending: the rank is the visual protagonist, the app is the
 * detail. Rows are full-width links so the whole row is the hit target.
 */
function RankedLayout({
  apps,
  badgesByAppId,
}: {
  apps: App[];
  badgesByAppId?: ReadonlyMap<string, readonly TrustBadge[]>;
}) {
  const t = useTranslations("app");
  return (
    <div className="card overflow-hidden p-1.5 sm:p-2">
      <ol className="divide-y divide-line/70">
        {apps.slice(0, 8).map((app, index) => (
          <li key={app.id}>
            <Link
              href={`/app/${app.slug}`}
              className={cn(
                "group flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-surface-2/70 sm:gap-4 sm:p-4",
              )}
            >
              <span
                aria-hidden
                className="text-ghost w-9 shrink-0 text-right font-display text-3xl font-bold tabular sm:w-12 sm:text-5xl"
              >
                {index + 1}
              </span>
              <AppIcon name={app.name} src={app.icon} size="md" rounded="rounded-xl" />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-semibold group-hover:text-accent">
                    {app.name}
                  </span>
                  <TrustBadgeList badges={badgesByAppId?.get(app.id) ?? []} size="sm" />
                </span>
                <span className="mt-0.5 block truncate text-sm text-muted">
                  {app.shortDescription || app.developer}
                </span>
              </span>
              <span className="hidden shrink-0 items-center gap-3 sm:flex">
                <PlatformBadgeRow platforms={app.platforms ?? []} />
                {app.trustScore != null ? (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-2xs font-semibold tabular",
                      app.trustScore >= 80
                        ? "bg-success/10 text-success"
                        : "bg-warning/10 text-warning",
                    )}
                    title={t("trustScore")}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                    {app.trustScore}
                  </span>
                ) : null}
                <TrendingUp className="h-4 w-4 text-accent/70" aria-hidden />
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Convenience: render a full Collection (title/description/apps) as a section. */
export function CollectionSectionFromCollection({
  collection,
  layout = "carousel",
  badgesByAppId,
  moreLabel,
}: {
  collection: Collection;
  layout?: CollectionLayout;
  badgesByAppId?: ReadonlyMap<string, readonly TrustBadge[]>;
  moreLabel?: string;
}) {
  const t = useTranslations("collections");
  const apps = collection.apps ?? [];
  return (
    <CollectionSection
      title={collection.name}
      description={collection.description}
      apps={apps}
      layout={layout}
      badgesByAppId={badgesByAppId}
      moreHref={`/collection/${collection.slug}`}
      moreLabel={moreLabel ?? t("browseAll")}
    />
  );
}

