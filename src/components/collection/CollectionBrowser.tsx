"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";

import type { App, Platform } from "@omnistore/shared-models";
import { AppGrid } from "@/components/app/AppCard";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type CollectionSort = "curated" | "name" | "updated" | "trust" | "popularity";

/**
 * CollectionBrowser — search-inside, platform filter, sorting and infinite
 * scroll for one collection's items. Ordering/filtering here is presentation
 * of an already-fetched set; catalog-wide ranking stays in OmniSource.
 */
export function CollectionBrowser({ apps }: { apps: App[] }) {
  const t = useTranslations("search");
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState<Platform | "all">("all");
  const [sort, setSort] = useState<CollectionSort>("curated");
  const [visible, setVisible] = useState(12);

  const platforms = useMemo(
    () => [...new Set(apps.flatMap((app) => app.platforms ?? []))],
    [apps],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    let result = apps;
    if (needle) {
      result = result.filter(
        (app) =>
          app.name.toLowerCase().includes(needle) ||
          (app.shortDescription ?? app.description).toLowerCase().includes(needle) ||
          app.tags.some((tag) => tag.toLowerCase().includes(needle)),
      );
    }
    if (platform !== "all") {
      result = result.filter((app) => (app.platforms ?? []).includes(platform));
    }
    const sorted = [...result];
    switch (sort) {
      case "name":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "updated":
        sorted.sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
        break;
      case "trust":
        sorted.sort((a, b) => (b.trustScore ?? -1) - (a.trustScore ?? -1));
        break;
      case "popularity":
        sorted.sort((a, b) => (b.popularityScore ?? -1) - (a.popularityScore ?? -1));
        break;
      case "curated":
      default:
        break;
    }
    return sorted;
  }, [apps, query, platform, sort]);

  // Reset pagination when the result set changes.
  useEffect(() => setVisible(12), [query, platform, sort]);

  useEffect(() => {
    if (visible >= filtered.length) return;
    const onScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 600) {
        setVisible((value) => Math.min(value + 12, filtered.length));
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [visible, filtered.length]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchInside")}
            aria-label={t("searchInside")}
            className="ps-10"
          />
        </div>
        <div className="flex gap-2">
          <Select
            value={platform}
            onChange={(event) => setPlatform(event.target.value as Platform | "all")}
            aria-label={t("platform")}
            className="w-36"
          >
            <option value="all">{t("allPlatforms")}</option>
            {platforms.map((candidate) => (
              <option key={candidate} value={candidate}>
                {candidate}
              </option>
            ))}
          </Select>
          <Select
            value={sort}
            onChange={(event) => setSort(event.target.value as CollectionSort)}
            aria-label={t("sort")}
            className="w-40"
          >
            <option value="curated">{t("sortRelevance")}</option>
            <option value="name">{t("sortName")}</option>
            <option value="updated">{t("sortUpdated")}</option>
            <option value="trust">{t("sortTrust")}</option>
            <option value="popularity">{t("sortPopularity")}</option>
          </Select>
        </div>
      </div>

      {filtered.length > 0 ? (
        <>
          <AppGrid apps={filtered.slice(0, visible)} />
          {visible < filtered.length ? (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => setVisible((value) => value + 12)}
                className={cn(
                  "rounded-full border border-line bg-surface px-5 py-2 text-sm font-medium",
                  "transition-colors hover:border-accent/50",
                )}
              >
                {t("loadMore")}
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <p className="py-10 text-center text-sm text-muted">{t("emptyTitle")}</p>
      )}
    </div>
  );
}
