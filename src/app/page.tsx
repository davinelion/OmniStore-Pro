import Link from "next/link";
import {
  ArrowRight,
  Layers,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { getProvider } from "@/lib/api";
import { AppCard } from "@/components/app/AppCard";
import { SectionHeading } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { PlatformBadge } from "@/components/platform/PlatformBadge";
import { PLATFORM_INFO } from "@/config/site";
import { formatNumber, relativeTime } from "@/lib/formatters";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const provider = getProvider();
  const [home, platforms] = await Promise.all([
    provider.getHome(),
    provider.getPlatforms(),
  ]);
  const { stats } = home;

  const categories = home.categories
    .filter((category) => category.app_count > 0)
    .slice(0, 8);

  return (
    <div className="space-y-16">
      <nav
        aria-label="Discovery workspace"
        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
      >
        {[
          {
            href: "/alternatives",
            title: "Find an alternative",
            text: "Switch with evidence, not guesswork.",
          },
          {
            href: "/updates",
            title: "Your update inbox",
            text: "New releases from apps you follow.",
          },
          {
            href: "/library",
            title: "Build your toolkit",
            text: "Personal collections, notes, and sharing.",
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="card p-4 transition-colors hover:border-accent"
          >
            <span className="font-semibold">{item.title} →</span>
            <span className="mt-1 block text-sm text-muted">{item.text}</span>
          </Link>
        ))}
      </nav>
      {/* ---------------------------------------------------------------- */}
      {/* Hero                                                              */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative overflow-hidden rounded-3xl border border-line bg-surface px-6 py-14 sm:px-10 sm:py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/10 blur-3xl"
        />
        <div className="relative grid grid-cols-1 gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-2 px-3 py-1 text-2xs uppercase tracking-[0.18em] text-fg-muted">
              <Layers className="h-3 w-3 text-accent" aria-hidden />
              Universal open-source discovery
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Discover Open-Source Apps
            </h1>
            <p className="mt-4 max-w-xl text-lg text-muted">
              Find trusted open-source software for all your devices.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/apps" size="lg">
                Explore Apps
                <ArrowRight className="h-4 w-4" aria-hidden />
              </ButtonLink>
              <ButtonLink href="/platforms" variant="outline" size="lg">
                Browse Platforms
              </ButtonLink>
            </div>

            <dl className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="Applications" value={formatNumber(stats.apps)} />
              <Stat label="Releases" value={formatNumber(stats.releases)} />
              <Stat
                label="Verified packages"
                value={formatNumber(stats.validatedAssets)}
              />
              <Stat label="Platforms" value={formatNumber(stats.platforms)} />
            </dl>
          </div>

          <form action="/search" role="search" className="card min-w-0 p-6">
            <label htmlFor="home-query" className="text-sm font-medium">
              Search across every platform
            </label>
            <div className="mt-3 flex items-center gap-2 rounded-2xl border border-line bg-surface-2 px-4 py-3 focus-within:border-accent/60">
              <Search className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
              <input
                id="home-query"
                name="q"
                autoComplete="off"
                placeholder="music, password, maps…"
                className="min-w-0 w-full bg-transparent outline-none placeholder:text-fg-subtle"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {["music", "password", "editor", "vpn", "player"].map(
                (suggestion) => (
                  <Link
                    key={suggestion}
                    href={`/search?q=${encodeURIComponent(suggestion)}`}
                    className="chip transition-colors hover:border-accent/50 hover:text-accent"
                  >
                    {suggestion}
                  </Link>
                ),
              )}
            </div>
            <ButtonLink
              href="/search"
              variant="secondary"
              className="mt-4 w-full"
            >
              Open universal search
            </ButtonLink>
          </form>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Featured                                                          */}
      {/* ---------------------------------------------------------------- */}
      <section aria-labelledby="featured-heading" className="space-y-5">
        <SectionHeading
          id="featured-heading"
          title="Featured Apps"
          description="Highest Trust Score in the catalog, computed from upstream signals."
          action={
            <Link
              href="/apps?sort=trust"
              className="text-sm text-accent hover:underline"
            >
              View all
            </Link>
          }
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {home.featured.slice(0, 4).map((app) => (
            <AppCard key={app.id} app={app} />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {home.featured.slice(4, 8).map((app) => (
            <AppCard key={app.id} app={app} />
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Popular + Recently updated                                        */}
      {/* ---------------------------------------------------------------- */}
      <section className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div className="space-y-5">
          <SectionHeading
            title="Popular Now"
            description="Ranked by upstream stars, forks, watchers and release recency."
            action={
              <Link
                href="/trending"
                className="text-sm text-accent hover:underline"
              >
                Trending
              </Link>
            }
          />
          <ul className="space-y-3">
            {home.popular.slice(0, 6).map((app, index) => (
              <li key={app.id}>
                <Link
                  href={`/apps/${app.slug}`}
                  className="card card-interactive flex items-center gap-3 p-3"
                >
                  <span className="w-5 shrink-0 text-center text-sm tabular-nums text-fg-subtle">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{app.name}</p>
                    <p className="truncate text-2xs text-fg-subtle">
                      {app.summary ?? "Description unavailable"}
                    </p>
                  </div>
                  <div className="hidden shrink-0 gap-1 sm:flex">
                    {app.platforms.slice(0, 3).map((platform) => (
                      <PlatformBadge
                        key={platform}
                        platform={platform}
                        size="xs"
                        withIcon={false}
                      />
                    ))}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-5">
          <SectionHeading
            title="Recently Updated"
            description="Apps whose upstream metadata or releases changed most recently."
            action={
              <Link
                href="/latest"
                className="text-sm text-accent hover:underline"
              >
                Latest
              </Link>
            }
          />
          <div className="grid grid-cols-1 gap-4">
            {home.updated.slice(0, 4).map((app) => (
              <AppCard key={app.id} app={app} />
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Categories                                                        */}
      {/* ---------------------------------------------------------------- */}
      <section aria-labelledby="categories-heading" className="space-y-5">
        <SectionHeading
          id="categories-heading"
          title="Popular Categories"
          action={
            <Link
              href="/categories"
              className="text-sm text-accent hover:underline"
            >
              All categories
            </Link>
          }
        />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/categories/${category.slug}`}
              className="card card-interactive p-4"
            >
              <p className="font-medium">{category.name}</p>
              <p className="mt-1 text-sm text-muted">
                {category.app_count} app{category.app_count === 1 ? "" : "s"}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Cross-platform — a signature OmniStore feature                    */}
      {/* ---------------------------------------------------------------- */}
      <section
        aria-labelledby="cross-platform-heading"
        className="rounded-3xl border border-accent/25 bg-accent-soft/40 px-6 py-10"
      >
        <SectionHeading
          id="cross-platform-heading"
          title="Cross-Platform Apps"
          description="One app identity across phones and desktops — OmniStore's signature view."
          action={
            <Link
              href="/discover/cross-platform"
              className="text-sm text-accent hover:underline"
            >
              Filter by platform set
            </Link>
          }
        />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {home.crossPlatform.slice(0, 4).map((app) => (
            <AppCard key={app.id} app={app} />
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* New releases                                                      */}
      {/* ---------------------------------------------------------------- */}
      <section aria-labelledby="new-heading" className="space-y-5">
        <SectionHeading
          id="new-heading"
          title="New Releases"
          description="The most recent upstream releases in the catalog."
          action={
            <Link
              href="/latest"
              className="text-sm text-accent hover:underline"
            >
              See all
            </Link>
          }
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {home.newest.slice(0, 6).map((app) => (
            <AppCard key={app.id} app={app} />
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Platforms                                                         */}
      {/* ---------------------------------------------------------------- */}
      <section aria-labelledby="platforms-heading" className="space-y-5">
        <SectionHeading id="platforms-heading" title="Explore by Platform" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {platforms.map((platform) => (
            <Link
              key={platform.slug}
              href={`/platforms/${platform.slug}`}
              className="card card-interactive flex items-center justify-between gap-3 p-4"
            >
              <div>
                <p className="font-medium">{platform.name}</p>
                <p className="mt-0.5 text-sm text-muted">
                  {platform.description}
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-line px-2.5 py-1 text-xs tabular-nums text-fg-muted">
                {platform.app_count}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Trust explainer                                                   */}
      {/* ---------------------------------------------------------------- */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <ShieldCheck className="h-5 w-5 text-accent" aria-hidden />
          <h2 className="mt-3 font-semibold">Explainable Trust Score</h2>
          <p className="mt-2 text-sm text-muted">
            Every score is computed from public upstream signals — licence,
            release recency, asset validation, repository activity — and you can
            open the full breakdown on any app page. It is not a security
            guarantee and not a malware scan.
          </p>
          <Link
            href="/docs#trust"
            className="mt-3 inline-block text-sm text-accent hover:underline"
          >
            How scoring works
          </Link>
        </div>
        <div className="card p-5">
          <Sparkles className="h-5 w-5 text-accent" aria-hidden />
          <h2 className="mt-3 font-semibold">Data comes from upstream</h2>
          <p className="mt-2 text-sm text-muted">
            OmniStore is a discovery and distribution interface. Versions,
            packages, licences and download links come from OmniSource and the
            upstream projects themselves — nothing is invented, and missing data
            is shown as “Not available”.
          </p>
          <Link
            href="/docs"
            className="mt-3 inline-block text-sm text-accent hover:underline"
          >
            Read the documentation
          </Link>
        </div>
      </section>

      <p className="text-center text-2xs text-fg-subtle">
        Catalog snapshot{" "}
        {home.freshness
          ? `updated ${relativeTime(home.freshness)}`
          : "unavailable"}{" "}
        · {formatNumber(stats.apps)} apps from {formatNumber(stats.developers)}{" "}
        upstream developers
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-2xs uppercase tracking-wide text-fg-subtle">
        {label}
      </dt>
      <dd className="text-xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
