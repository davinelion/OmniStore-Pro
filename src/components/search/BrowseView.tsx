import Link from "next/link";
import { getTranslations } from "next-intl/server";

import type { Category, PlatformInfo, SearchFilters } from "@omnistore/shared-models";
import { getOmnisource } from "@/lib/omnisource";
import { AppCard } from "@/components/app/AppCard";
import { BrowseFilters } from "./BrowseFilters";
import { SearchBox } from "./SearchBox";

export interface BrowseQuery {
  q?: string;
  platform?: string;
  category?: string;
  license?: string;
  architecture?: string;
  openSource?: string;
  sort?: string;
  page?: string;
  minTrust?: string;
}

/**
 * Shared server-rendered browse/search view. The query is forwarded to
 * OmniSource's engine verbatim — no local filtering or ranking.
 */
export async function BrowseView({
  query,
  mode,
  categories,
  platforms,
}: {
  query: BrowseQuery;
  mode: "search" | "browse";
  categories: Category[];
  platforms: PlatformInfo[];
}) {
  const [t, tSearch] = await Promise.all([getTranslations("browse"), getTranslations("search")]);
  const client = getOmnisource();

  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const perPage = 24;
  const params: SearchFilters & { perPage?: number } = {
    perPage,
    page,
  };
  if (query.q) params.q = query.q;
  if (query.platform) params.platform = query.platform as SearchFilters["platform"];
  if (query.category) params.category = query.category;
  if (query.license) params.license = query.license;
  if (query.architecture) params.architecture = query.architecture as SearchFilters["architecture"];
  if (query.openSource === "true") params.openSource = true;
  if (query.minTrust) params.minTrust = Number(query.minTrust);
  params.sort = (query.sort ??
    (mode === "search" ? "relevance" : "popularity")) as SearchFilters["sort"];

  const result = await (mode === "search"
    ? client.search(params.q ?? "", params)
    : client.getApps(params));

  const { items, pagination } = result;

  function pageHref(next: number): string {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value) search.set(key, String(value));
    }
    search.set("page", String(next));
    return `${mode === "search" ? "/search" : "/apps"}?${search.toString()}`;
  }

  function filterHref(key: keyof BrowseQuery, value: string | undefined): string {
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v && k !== key) search.set(k, String(v));
    }
    if (value) search.set(key, value);
    if (search.get("page")) search.set("page", "1");
    return `${mode === "search" ? "/search" : "/apps"}?${search.toString()}`;
  }

  const heading = mode === "search" && query.q ? tSearch("for", { query: query.q }) : t("title");

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{heading}</h1>
          <p className="mt-1 text-sm text-muted" aria-live="polite">
            {tSearch("results", { count: pagination.total })}
          </p>
        </div>
        <div className="max-w-xl">
          <SearchBox initialQuery={query.q ?? ""} />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        {/* Filters (client island — navigates server-rendered results) */}
      <BrowseFilters query={query} mode={mode} categories={categories} platforms={platforms} />

        {/* Results */}
        <div className="min-w-0 space-y-6">
          {items.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((app) => (
                <AppCard key={app.id} app={app} />
              ))}
            </div>
          ) : (
            <p className="py-16 text-center text-sm text-muted">
              {query.q ? tSearch("empty", { query: query.q }) : tSearch("noQuery")}
            </p>
          )}

          {pagination.totalPages > 1 ? (
            <nav aria-label="Pagination" className="flex items-center justify-center gap-2">
              {pagination.page > 1 ? (
                <Link
                  href={pageHref(pagination.page - 1)}
                  rel="prev"
                  className="rounded-full border border-line bg-surface px-4 py-1.5 text-sm hover:border-accent/50"
                >
                  ←
                </Link>
              ) : null}
              <span className="text-sm tabular-nums text-muted">
                {pagination.page} / {pagination.totalPages}
              </span>
              {pagination.page < pagination.totalPages ? (
                <Link
                  href={pageHref(pagination.page + 1)}
                  rel="next"
                  className="rounded-full border border-line bg-surface px-4 py-1.5 text-sm hover:border-accent/50"
                >
                  →
                </Link>
              ) : null}
            </nav>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function FilterBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-subtle">{label}</p>
      {children}
    </div>
  );
}
