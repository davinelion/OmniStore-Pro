"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { AlertTriangle, Loader2, SearchX } from "lucide-react";
import Link from "next/link";

import { omniClient, queryKeys, userFacingError } from "@/lib/api/client";
import { SORT_OPTIONS, type SearchFilters } from "@/lib/search/query";
import { AppCard } from "@/components/app/AppCard";
import { AppGridSkeleton, EmptyState } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { track } from "@/lib/analytics";

/**
 * Live search results.
 *
 * Loading, empty, error and offline states are all first-class: a slow or
 * failing OmniSource must never produce a blank page.
 */
export function SearchResults({
  filters,
  onFiltersChange,
}: {
  filters: SearchFilters;
  onFiltersChange: (next: Partial<SearchFilters>) => void;
}) {
  const query = useQuery({
    queryKey: queryKeys.search(filters),
    queryFn: () => omniClient.search(filters),
    // Keep the previous page visible while the next one loads (no layout jump).
    placeholderData: keepPreviousData,
  });

  const pagination = query.data?.pagination;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted" aria-live="polite">
          {query.isPending && !query.data ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              Searching…
            </span>
          ) : pagination ? (
            <>
              <span className="font-medium text-fg">{pagination.total.toLocaleString("en-US")}</span>{" "}
              {pagination.total === 1 ? "result" : "results"}
              {filters.q ? (
                <>
                  {" for “"}
                  <span className="font-medium text-fg">{filters.q}</span>
                  {"”"}
                </>
              ) : null}
            </>
          ) : (
            "Search"
          )}
        </p>

        <div className="flex items-center gap-2">
          <Select
            label="Sort"
            value={filters.sort}
            onChange={(value) => onFiltersChange({ sort: value as SearchFilters["sort"], page: 1 })}
            options={SORT_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
            className="min-w-[10rem]"
          />
        </div>
      </div>

      {query.isPending && !query.data ? <AppGridSkeleton count={6} /> : null}

      {query.isError ? (
        <div
          role="alert"
          className="flex flex-col items-center gap-3 rounded-2xl border border-danger/30 bg-danger/5 px-6 py-12 text-center"
        >
          <AlertTriangle className="h-5 w-5 text-danger" aria-hidden />
          <p className="font-medium">{userFacingError(query.error)}</p>
          <Button variant="outline" onClick={() => query.refetch()}>
            Try Again
          </Button>
        </div>
      ) : null}

      {query.data && query.data.items.length === 0 ? (
        <EmptyState
          icon={<SearchX className="h-6 w-6" aria-hidden />}
          title="No apps found."
          description="Try another search or remove some filters."
          action={
            <Button
              variant="outline"
              onClick={() =>
                onFiltersChange({
                  platforms: [],
                  categories: [],
                  licenses: [],
                  architectures: [],
                  packageTypes: [],
                  openSource: null,
                  minTrust: null,
                  minQuality: null,
                  updatedWithinDays: null,
                  q: "",
                  page: 1,
                })
              }
            >
              Clear filters
            </Button>
          }
        />
      ) : null}

      {query.data && query.data.items.length > 0 ? (
        <>
          <div
            className={
              query.isFetching && query.data ? "grid gap-4 opacity-60 transition-opacity sm:grid-cols-2 xl:grid-cols-3" : "grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
            }
          >
            {query.data.items.map((app) => (
              <AppCard key={app.id} app={app} />
            ))}
          </div>
          <Pagination
            page={pagination?.page ?? 1}
            totalPages={pagination?.total_pages ?? 1}
            onChange={(page) => {
              onFiltersChange({ page });
              track("search", { page });
            }}
          />
        </>
      ) : null}
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages = buildPageList(page, totalPages);

  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-1">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label="Previous page"
      >
        Previous
      </Button>
      {pages.map((entry, index) =>
        entry === "gap" ? (
          <span key={`gap-${index}`} className="px-2 text-fg-subtle">
            …
          </span>
        ) : (
          <button
            key={entry}
            type="button"
            onClick={() => onChange(entry)}
            aria-current={entry === page ? "page" : undefined}
            aria-label={`Page ${entry}`}
            className={
              entry === page
                ? "h-8 min-w-8 rounded-full bg-accent px-3 text-sm text-accent-fg"
                : "h-8 min-w-8 rounded-full border border-line px-3 text-sm hover:bg-surface-2"
            }
          >
            {entry}
          </button>
        ),
      )}
      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        aria-label="Next page"
      >
        Next
      </Button>
      {/* Crawlable, shareable page links for the same results. */}
      <span className="sr-only">
        <Link href={`?page=${page}`}>Page {page}</Link>
      </span>
    </nav>
  );
}

function buildPageList(page: number, totalPages: number): Array<number | "gap"> {
  const pages = new Set<number>([1, totalPages, page, page - 1, page + 1]);
  const filtered = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const out: Array<number | "gap"> = [];
  let previous = 0;
  for (const current of filtered) {
    if (previous && current - previous > 1) out.push("gap");
    out.push(current);
    previous = current;
  }
  return out;
}
