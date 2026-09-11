"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import type { Category, PlatformInfo } from "@omnistore/shared-models";
import { Select } from "@/components/ui/select";
import type { BrowseQuery } from "./BrowseView";

/**
 * Client island for the browse/search filter rail. The parent page is a
 * Server Component — filter changes navigate via the router so the results
 * stay server-rendered and cacheable.
 */
export function BrowseFilters({
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
  const t = useTranslations("search");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const basePath = mode === "search" ? "/search" : "/apps";

  function hrefFor(key: keyof BrowseQuery, value: string | undefined): string {
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v && k !== key) search.set(k, String(v));
    }
    if (value) search.set(key, value);
    if (search.get("page")) search.set("page", "1");
    return `${basePath}?${search.toString()}`;
  }

  function navigate(key: keyof BrowseQuery, value: string) {
    startTransition(() => {
      router.push(hrefFor(key, value || undefined), { scroll: false });
    });
  }

  const defaultSort = query.sort ?? (mode === "search" ? "relevance" : "popularity");

  return (
    <aside
      className="space-y-4"
      aria-label={t("filters")}
      aria-busy={pending}
      data-pending={pending || undefined}
    >
      <FilterBlock label={t("platform")}>
        <Select
          value={query.platform ?? ""}
          onChange={(event) => navigate("platform", event.target.value)}
          aria-label={t("platform")}
        >
          <option value="">{t("allPlatforms")}</option>
          {platforms.map((platform) => (
            <option key={platform.id} value={platform.id}>
              {platform.displayName}
            </option>
          ))}
        </Select>
      </FilterBlock>
      <FilterBlock label={t("category")}>
        <Select
          value={query.category ?? ""}
          onChange={(event) => navigate("category", event.target.value)}
          aria-label={t("category")}
        >
          <option value="">{t("allCategories")}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.slug}>
              {category.name}
            </option>
          ))}
        </Select>
      </FilterBlock>
      <FilterBlock label={t("sort")}>
        <Select
          value={defaultSort}
          onChange={(event) => navigate("sort", event.target.value)}
          aria-label={t("sort")}
        >
          <option value="relevance">{t("sortRelevance")}</option>
          <option value="popularity">{t("sortPopularity")}</option>
          <option value="updated">{t("sortUpdated")}</option>
          <option value="newest">{t("sortNewest")}</option>
          <option value="name">{t("sortName")}</option>
          <option value="trust">{t("sortTrust")}</option>
        </Select>
      </FilterBlock>
    </aside>
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
