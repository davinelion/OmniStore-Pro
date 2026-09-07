import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getProvider } from "@/lib/api";
import { AppBrowser } from "@/components/app/AppBrowser";
import { parseFilters, withFilterChange } from "@/lib/search/query";

export const dynamic = "force-dynamic";

type Params = { params: { slug: string } };
type SearchParams = Record<string, string | string[] | undefined>;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const categories = await getProvider().getCategories();
  const category = categories.find((entry) => entry.slug === params.slug);
  if (!category) return { title: "Category not found" };
  return {
    title: `${category.name} apps`,
    description:
      category.description ??
      `Open-source ${category.name.toLowerCase()} applications indexed by OmniSource.`,
    alternates: { canonical: `/categories/${category.slug}` },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: SearchParams;
}) {
  const provider = getProvider();
  const categories = await provider.getCategories();
  const category = categories.find((entry) => entry.slug === params.slug);
  if (!category) notFound();

  // The category is part of the URL, so it is forced into the filter set.
  const filters = withFilterChange(parseFilters(searchParams), { categories: [category.slug] });

  const [result, platforms, licenses] = await Promise.all([
    provider.getApps(filters),
    provider.getPlatforms(),
    provider.getLicenses(),
  ]);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{category.name}</h1>
        <p className="text-muted">{category.description}</p>
      </header>

      <AppBrowser
        result={result}
        filters={filters}
        basePath={`/categories/${category.slug}`}
        facets={{
          categories: categories.map((entry) => ({
            value: entry.slug,
            label: entry.name,
            count: entry.app_count,
          })),
          platforms: platforms.map((platform) => ({
            value: platform.slug,
            label: platform.name,
            count: platform.app_count,
          })),
          licenses: licenses.map((license) => ({ value: license.id, label: license.name, count: license.count })),
        }}
        emptyTitle={`No apps in ${category.name}.`}
        emptyDescription="Try removing a filter to see more results."
      />
    </div>
  );
}
