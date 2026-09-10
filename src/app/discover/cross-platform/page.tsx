import type { Metadata } from "next";
import Link from "next/link";

import { getProvider } from "@/lib/api";
import { AppCard } from "@/components/app/AppCard";
import { EmptyState, SectionHeading } from "@/components/ui/primitives";
import { PlatformAvailability } from "@/components/platform/PlatformBadge";
import { withFilterChange } from "@/lib/search/query";
import { DEFAULT_FILTERS } from "@/lib/search/query";
import { PLATFORM_INFO } from "@/config/site";
import { pluralize } from "@/lib/formatters";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SearchParams = { all?: string; sort?: string };

export const metadata: Metadata = {
  title: "Cross-Platform Apps",
  description:
    "Open-source applications available on multiple platforms. Filter to apps that support every platform you selected.",
  alternates: { canonical: "/discover/cross-platform" },
};

/**
 * Cross-platform discovery — a signature OmniStore view.
 *
 * Selecting platforms means "available on ALL of these", which is the question
 * a user with a mixed device setup actually has.
 */
export default async function CrossPlatformPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const resolvedSearchParams = await searchParams;
  const selected = (resolvedSearchParams.all ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  const sort = resolvedSearchParams.sort ?? "trust";

  const provider = getProvider();
  const filters = withFilterChange(DEFAULT_FILTERS, {
    allPlatforms: selected as never,
    sort: sort as never,
    perPage: 24,
  });

  const result = await provider.getApps(filters);

  const toggleHref = (slug: string) => {
    const next = selected.includes(slug)
      ? selected.filter((entry) => entry !== slug)
      : [...selected, slug];
    const query = new URLSearchParams();
    if (next.length) query.set("all", next.join(","));
    if (sort !== "trust") query.set("sort", sort);
    const qs = query.toString();
    return qs ? `/discover/cross-platform?${qs}` : "/discover/cross-platform";
  };

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">Cross-Platform Apps</h1>
        <p className="max-w-2xl text-muted">
          One application identity across phones and desktops. Select platforms below to see only the
          apps that support <span className="font-medium text-fg">all</span> of them.
        </p>
      </header>

      <div className="rounded-2xl border border-line bg-surface p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-sm font-medium">Available on all of:</span>
          {PLATFORM_INFO.map((platform) => (
            <Link
              key={platform.slug}
              href={toggleHref(platform.slug)}
              aria-pressed={selected.includes(platform.slug)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition-colors",
                selected.includes(platform.slug)
                  ? "border-accent bg-accent text-accent-fg"
                  : "border-line hover:border-accent/50 hover:text-accent",
              )}
            >
              {platform.name}
              <span className="ml-1.5 text-2xs opacity-70">{platform.app_count}</span>
            </Link>
          ))}
          {selected.length > 0 ? (
            <Link
              href="/discover/cross-platform"
              className="ml-auto text-sm text-fg-muted transition-colors hover:text-fg"
            >
              Reset
            </Link>
          ) : null}
        </div>

        {selected.length > 0 ? (
          <div className="mt-4 border-t border-line pt-4">
            <p className="mb-2 text-xs uppercase tracking-wide text-fg-subtle">Required availability</p>
            <PlatformAvailability platforms={selected} />
          </div>
        ) : null}
      </div>

      <SectionHeading
        title={selected.length > 0 ? `Apps on ${selected.length} platforms` : "Most cross-platform apps"}
        description={`${pluralize(result.pagination.total, "app")} match${
          result.pagination.total === 1 ? "es" : ""
        } this selection.`}
      />

      {result.items.length === 0 ? (
        <EmptyState
          title="No apps support every selected platform."
          description="Try removing a platform to widen the results."
          action={
            <Link
              href="/discover/cross-platform"
              className="inline-flex h-9 items-center rounded-full border border-line px-4 text-sm hover:bg-surface-2"
            >
              Reset selection
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {result.items.map((app) => (
            <div key={app.id} className="space-y-2">
              <AppCard app={app} />
              <div className="px-1">
                <PlatformAvailability
                  platforms={app.platforms}
                  className="gap-1 text-2xs [&>li]:rounded-lg [&>li]:px-2 [&>li]:py-0.5 [&>li]:text-2xs"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
