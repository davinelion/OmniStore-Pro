import { SearchX } from "lucide-react";
import Link from "next/link";

import type { AppListResult } from "@/lib/api/provider";
import type { SearchFilters } from "@/lib/search/query";
import { AppCard } from "./AppCard";
import { EmptyState } from "@/components/ui/primitives";
import { PaginationLinks } from "@/components/search/PaginationLinks";
import { BrowseFilters } from "@/components/search/BrowseFilters";
import type { FacetOption } from "@/components/search/FilterPanel";
import { SORT_OPTIONS } from "@/lib/search/query";
import { filtersToQuery } from "@/lib/search/query";
import { cn } from "@/lib/utils";

/**
 * Server-rendered app listing with a client filter sidebar.
 *
 * Results are produced on the server so the catalog is indexable and usable
 * without JavaScript; filters navigate, they do not hide server data.
 */
export function AppBrowser({
  result,
  filters,
  basePath,
  facets,
  heading,
  description,
  emptyTitle = "No apps found.",
  emptyDescription = "Try another search or remove some filters.",
  showSort = true,
  className,
}: {
  result: AppListResult;
  filters: SearchFilters;
  basePath: string;
  facets: { categories: FacetOption[]; platforms: FacetOption[]; licenses: FacetOption[] };
  heading?: React.ReactNode;
  description?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  showSort?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-8 lg:grid-cols-[240px_1fr]", className)}>
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <BrowseFilters facets={facets} basePath={basePath} />
      </aside>

      <div className="min-w-0 space-y-5">
        {heading ? <div className="space-y-1">{heading}</div> : null}
        {description ? <p className="text-sm text-muted">{description}</p> : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">
            <span className="font-medium text-fg">{result.pagination.total.toLocaleString("en-US")}</span>{" "}
            {result.pagination.total === 1 ? "app" : "apps"}
            {filters.q ? (
              <>
                {" for “"}
                <span className="font-medium text-fg">{filters.q}</span>
                {"”"}
              </>
            ) : null}
          </p>

          {showSort ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-2xs uppercase tracking-wide text-fg-subtle">Sort</span>
              {SORT_OPTIONS.map((option) => {
                const query = filtersToQuery({
                  ...filters,
                  sort: option.value === "relevance" ? undefined : option.value,
                  page: undefined,
                });
                return (
                  <Link
                    key={option.value}
                    href={query ? `${basePath}?${query}` : basePath}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-2xs transition-colors",
                      filters.sort === option.value
                        ? "border-accent/40 bg-accent-soft text-accent"
                        : "border-line text-fg-muted hover:text-fg",
                    )}
                  >
                    {option.label}
                  </Link>
                );
              })}
            </div>
          ) : null}
        </div>

        {result.items.length === 0 ? (
          <EmptyState
            icon={<SearchX className="h-6 w-6" aria-hidden />}
            title={emptyTitle}
            description={emptyDescription}
            action={
              <Link
                href={basePath}
                className="inline-flex h-9 items-center rounded-full border border-line px-4 text-sm hover:bg-surface-2"
              >
                Clear filters
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {result.items.map((app) => (
              <AppCard key={app.id} app={app} />
            ))}
          </div>
        )}

        <PaginationLinks
          filters={filters}
          page={result.pagination.page}
          totalPages={result.pagination.total_pages}
          basePath={basePath}
        />
      </div>
    </div>
  );
}
