import type { Metadata } from "next";

import { getProvider } from "@/lib/api";
import { AppBrowser } from "@/components/app/AppBrowser";
import { parseFilters } from "@/lib/search/query";
import { formatNumber } from "@/lib/formatters";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

export const metadata: Metadata = {
  title: "Apps",
  description:
    "Browse open-source applications across iOS, Android, Windows, macOS and Linux, with platform-aware packages and transparent scores.",
  alternates: { canonical: "/apps" },
};

export default async function AppsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const resolvedSearchParams = await searchParams;
  const provider = getProvider();
  const filters = parseFilters(resolvedSearchParams);

  const [result, categories, platforms, licenses] = await Promise.all([
    provider.getApps(filters),
    provider.getCategories(),
    provider.getPlatforms(),
    provider.getLicenses(),
  ]);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Apps</h1>
        <p className="text-muted">
          {formatNumber(result.pagination.total)} open-source applications indexed by OmniSource from
          upstream repositories.
        </p>
      </header>

      <AppBrowser
        result={result}
        filters={filters}
        basePath="/apps"
        facets={{
          categories: categories.map((category) => ({
            value: category.slug,
            label: category.name,
            count: category.app_count,
          })),
          platforms: platforms.map((platform) => ({
            value: platform.slug,
            label: platform.name,
            count: platform.app_count,
          })),
          licenses: licenses.map((license) => ({ value: license.id, label: license.name, count: license.count })),
        }}
      />
    </div>
  );
}
