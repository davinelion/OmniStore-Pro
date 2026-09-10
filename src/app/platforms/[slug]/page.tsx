import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getProvider } from "@/lib/api";
import { AppCard } from "@/components/app/AppCard";
import { SectionHeading } from "@/components/ui/primitives";
import { platformIcon } from "@/components/platform/PlatformIcon";
import { parseFilters } from "@/lib/search/query";
import { pluralize } from "@/lib/formatters";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const resolvedParams = await params;
  const platforms = await getProvider().getPlatforms();
  const platform = platforms.find((entry) => entry.slug === resolvedParams.slug);
  if (!platform) return { title: "Platform not found" };
  return {
    title: `${platform.name} apps`,
    description:
      platform.description ??
      `Open-source applications with verified ${platform.name} packages.`,
    alternates: { canonical: `/platforms/${platform.slug}` },
  };
}

export default async function PlatformPage({ params }: Params) {
  const resolvedParams = await params;
  const provider = getProvider();
  const platforms = await provider.getPlatforms();
  const platform = platforms.find((entry) => entry.slug === resolvedParams.slug);
  if (!platform) notFound();

  const filters = parseFilters({ platform: platform.slug, per_page: "12" });
  const [popular, latest, updated, categories] = await Promise.all([
    provider.getApps({ ...filters, sort: "popularity" }),
    provider.getApps({ ...filters, sort: "newest" }),
    provider.getApps({ ...filters, sort: "updated" }),
    provider.getCategories(),
  ]);

  const Icon = platformIcon(platform.slug);
  const categoriesForPlatform = categories
    .map((category) => ({
      ...category,
      count: popular.items.filter((app) => app.categories.includes(category.slug)).length,
    }))
    .filter((category) => category.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  return (
    <div className="space-y-12">
      <header className="flex flex-wrap items-start gap-4">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <Icon className="h-7 w-7" aria-hidden />
        </span>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{platform.name} apps</h1>
          <p className="mt-1 text-muted">{platform.description}</p>
          <p className="mt-2 text-xs text-fg-subtle">
            {pluralize(platform.app_count, "app")} · install methods:{" "}
            {platform.install_methods.join(" / ") || "Not available"}
          </p>
        </div>
      </header>

      <section className="rounded-2xl border border-line bg-surface-2/40 p-4 text-sm text-muted">
        <span className="font-medium text-fg">Installation:</span> {platform.install_methods.join(" / ")} —{" "}
        OmniStore hands you to the upstream download; {platform.name} completes the installation.
      </section>

      <section aria-labelledby="popular-heading" className="space-y-4">
        <SectionHeading
          id="popular-heading"
          title="Popular Apps"
          action={
            <Link
              href={`/apps?platform=${platform.slug}&sort=popularity`}
              className="text-sm text-accent hover:underline"
            >
              View all
            </Link>
          }
        />
        {popular.items.length === 0 ? (
          <p className="text-sm text-muted">No apps have been validated for this platform yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {popular.items.slice(0, 6).map((app) => (
              <AppCard key={app.id} app={app} />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="latest-heading" className="space-y-4">
        <SectionHeading id="latest-heading" title="Latest Apps" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {latest.items.slice(0, 3).map((app) => (
            <AppCard key={app.id} app={app} />
          ))}
        </div>
      </section>

      <section aria-labelledby="updated-heading" className="space-y-4">
        <SectionHeading id="updated-heading" title="Recently Updated" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {updated.items.slice(0, 3).map((app) => (
            <AppCard key={app.id} app={app} />
          ))}
        </div>
      </section>

      {categoriesForPlatform.length > 0 ? (
        <section aria-labelledby="categories-heading" className="space-y-4">
          <SectionHeading id="categories-heading" title="Categories" />
          <ul className="flex flex-wrap gap-2">
            {categoriesForPlatform.map((category) => (
              <li key={category.slug}>
                <Link
                  href={`/categories/${category.slug}?platform=${platform.slug}`}
                  className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-sm transition-colors hover:border-accent/50 hover:text-accent"
                >
                  {category.name}
                  <span className="text-2xs text-fg-subtle">{category.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
