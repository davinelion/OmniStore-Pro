"use client";

import Link from "next/link";
import { useRef } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { App, Collection, CollectionLayout } from "@omnistore/shared-models";
import type { TrustBadge } from "@omnistore/shared-models";
import { cn } from "@/lib/utils";
import { AppCard } from "@/components/app/AppCard";
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

