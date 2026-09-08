"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import {
  DEFAULT_FILTERS,
  parseFilters,
  searchHref,
  withFilterChange,
  type SearchFilters,
} from "@/lib/search/query";
import { omniClient, queryKeys } from "@/lib/api/client";
import { FilterPanel, ActiveFilterChips, type FacetOption } from "./FilterPanel";
import { SearchResults } from "./SearchResults";
import { track } from "@/lib/analytics";

/**
 * Universal search experience.
 *
 * State lives in the URL: every keystroke (debounced), filter and sort change
 * is a shareable link, and the browser back button walks the search history.
 */
export function SearchExperience() {
  const router = useRouter();
  const params = useSearchParams();

  const filters = useMemo<SearchFilters>(
    () => parseFilters(Object.fromEntries(params.entries())),
    [params],
  );

  const update = useCallback(
    (next: Partial<SearchFilters>) => {
      const merged = withFilterChange(filters, next);
      // `replace` for query text, `push` is unnecessary noise in history.
      router.replace(searchHref(merged), { scroll: false });
    },
    [filters, router],
  );

  const { data: categories } = useQuery({
    queryKey: queryKeys.categories(),
    queryFn: () => omniClient.getCategories(),
    staleTime: 30 * 60_000,
  });

  const { data: platforms } = useQuery({
    queryKey: queryKeys.platforms(),
    queryFn: () => omniClient.getPlatforms(),
    staleTime: 30 * 60_000,
  });

  const { data: licenses } = useQuery({
    queryKey: queryKeys.licenses(),
    queryFn: () => omniClient.getLicenses(),
    staleTime: 30 * 60_000,
  });

  const facets = useMemo(
    () => ({
      categories: (categories ?? []).map((category) => ({
        value: category.slug,
        label: category.name,
        count: category.app_count,
      })) satisfies FacetOption[],
      platforms: (platforms ?? []).map((platform) => ({
        value: platform.slug,
        label: platform.name,
        count: platform.app_count,
      })) satisfies FacetOption[],
      licenses: (licenses ?? []).map((license) => ({
        value: license.id,
        label: license.name,
        count: license.count,
      })) satisfies FacetOption[],
    }),
    [categories, platforms, licenses],
  );

  return (
    <div className="space-y-6">
      <SearchInput value={filters.q} onQueryChange={(q) => update({ q })} />

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <FilterPanel filters={filters} onChange={update} facets={facets} />
        </aside>

        <div className="min-w-0 space-y-4">
          <ActiveFilterChips filters={filters} onChange={update} labels={{ categories: facets.categories }} />
          <SearchResults filters={filters} onFiltersChange={update} />
        </div>
      </div>
    </div>
  );
}

/** Debounced query box that keeps the URL in sync without a form submit. */
export function SearchInput({
  value,
  onQueryChange,
  autoFocus,
}: {
  value: string;
  onQueryChange: (value: string) => void;
  autoFocus?: boolean;
}) {
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSent = useRef(value);

  // Keep the field in step with external URL changes (back button, filters).
  useEffect(() => {
    if (value !== lastSent.current) {
      setDraft(value);
      lastSent.current = value;
    }
  }, [value]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => () => (debounce.current ? clearTimeout(debounce.current) : undefined), []);

  function onChange(next: string) {
    setDraft(next);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      lastSent.current = next;
      onQueryChange(next);
      if (next.trim()) track("search", { query: next });
    }, 300);
  }

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        if (debounce.current) clearTimeout(debounce.current);
        lastSent.current = draft;
        onQueryChange(draft);
      }}
      className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-3 focus-within:border-accent/60"
    >
      <Search className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
      <input
        ref={inputRef}
        type="search"
        value={draft}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search apps, developers, categories, licences, platforms…"
        aria-label="Search apps"
        autoComplete="off"
        className="w-full bg-transparent outline-none placeholder:text-fg-subtle"
      />
      {draft ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="rounded-full p-1 text-fg-subtle transition-colors hover:text-fg"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
    </form>
  );
}

export { DEFAULT_FILTERS };
