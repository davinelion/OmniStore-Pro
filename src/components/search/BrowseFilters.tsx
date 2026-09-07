"use client";

import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { parseFilters, searchHref, withFilterChange, type SearchFilters } from "@/lib/search/query";
import { FilterPanel, ActiveFilterChips, type FacetOption } from "./FilterPanel";

/**
 * Filter sidebar for server-rendered listings.
 *
 * The results themselves are rendered on the server (so crawlers and users
 * without JavaScript still get the catalog); only the controls are client side,
 * and they navigate rather than mutate local state.
 */
export function BrowseFilters({
  facets,
  basePath,
  showChips = true,
}: {
  facets: { categories: FacetOption[]; platforms: FacetOption[]; licenses: FacetOption[] };
  basePath: string;
  showChips?: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();

  const filters = useMemo<SearchFilters>(
    () => parseFilters(Object.fromEntries(params.entries())),
    [params],
  );

  const update = useCallback(
    (next: Partial<SearchFilters>) => {
      const merged = withFilterChange(filters, next);
      const query = new URLSearchParams(searchHref(merged).split("?")[1] ?? "").toString();
      router.push(query ? `${basePath}?${query}` : basePath, { scroll: false });
    },
    [filters, router, basePath],
  );

  return (
    <div className="space-y-4">
      <FilterPanel filters={filters} onChange={update} facets={facets} />
      {showChips ? (
        <ActiveFilterChips filters={filters} onChange={update} labels={{ categories: facets.categories }} />
      ) : null}
    </div>
  );
}
