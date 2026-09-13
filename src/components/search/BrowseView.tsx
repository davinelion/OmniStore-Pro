import Link from "next/link";
import { getTranslations } from "next-intl/server";

import type { Category, PlatformInfo, SearchFilters } from "@omnistore/shared-models";
import { getOmnisource } from "@/lib/omnisource";
import { orFallback } from "@/lib/omnisource/with-fallback";
import { StoreAppGrid } from "@/components/store/StoreAppCard";
import { PlatformTabs } from "@/components/store/PlatformTabs";
import { BrowseFilters } from "./BrowseFilters";
import { SearchBox } from "./SearchBox";
import { AIAssistant } from "@/components/store/AIAssistant";
import { AutomationBanner } from "@/components/store/CrossPlatformBanner";
import { Layers, Sparkles } from "lucide-react";

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
 * Shared server-rendered browse/search view - now App Store style with direct downloads + source links
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

  const result = await orFallback(
    mode === "search" ? client.search(params.q ?? "", params) : client.getApps(params),
    { items: [], pagination: { page, perPage, total: 0, totalPages: 0 }, freshness: null },
    `${mode} results`,
  );

  const { items, pagination } = result;

  // For AI assistant, get all apps if searching
  const allAppsForAI = mode === "search" && !query.q ? [] : items;

  function pageHref(next: number): string {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value) search.set(key, String(value));
    }
    search.set("page", String(next));
    return `${mode === "search" ? "/search" : "/apps"}?${search.toString()}`;
  }

  const heading = mode === "search" && query.q ? tSearch("for", { query: query.q }) : t("title");

  const activePlatform = query.platform ?? null;

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
              <Layers className="h-6 w-6 text-accent" />
              {heading}
              <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent">{pagination.total} apps</span>
            </h1>
            <p className="mt-1 text-sm text-muted" aria-live="polite">
              {tSearch("results", { count: pagination.total })} • Direct downloads + source links • Cross-platform
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              Live • Automated
            </span>
          </div>
        </div>

        <div className="max-w-2xl">
          <SearchBox initialQuery={query.q ?? ""} />
        </div>

        <PlatformTabs platforms={platforms} activePlatform={activePlatform} />

        {mode === "browse" && !query.q ? (
          <div className="rounded-xl border border-accent/20 bg-accent-soft/30 p-3 flex items-start gap-2.5">
            <Sparkles className="h-4 w-4 text-accent mt-0.5 shrink-0" />
            <p className="text-xs leading-relaxed text-muted">
              <strong className="text-fg">App Store experience:</strong> Every card shows <strong>Direct Download</strong> for your platform + <strong>Source Link</strong> (GitHub). 
              Filter by platform (Windows, macOS, Linux, Android, iOS) to see platform-specific stores. All 444 apps are here — like Play Store, App Store, F-Droid combined.
            </p>
          </div>
        ) : null}
      </header>

      {mode === "search" && query.q && items.length > 0 ? (
        <AIAssistant apps={items} />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <BrowseFilters query={query} mode={mode} categories={categories} platforms={platforms} />

        <div className="min-w-0 space-y-6">
          {items.length > 0 ? (
            <StoreAppGrid apps={items} preferredPlatform={activePlatform as any} />
          ) : (
            <div className="py-16 text-center space-y-3">
              <p className="text-sm text-muted">
                {query.q ? tSearch("empty", { query: query.q }) : tSearch("noQuery")}
              </p>
              <p className="text-xs text-subtle">Try AI search: &apos;video editor for Linux&apos; or browse by platform above</p>
            </div>
          )}

          {pagination.totalPages > 1 ? (
            <nav aria-label="Pagination" className="flex items-center justify-center gap-2 pt-4">
              {pagination.page > 1 ? (
                <Link
                  href={pageHref(pagination.page - 1)}
                  rel="prev"
                  className="rounded-full border border-line bg-surface px-5 py-2 text-sm font-medium hover:border-accent/50 transition-colors"
                >
                  ← Previous
                </Link>
              ) : null}
              <span className="rounded-full bg-surface-3 px-4 py-2 text-sm tabular-nums text-muted">
                {pagination.page} / {pagination.totalPages} • {pagination.total} apps
              </span>
              {pagination.page < pagination.totalPages ? (
                <Link
                  href={pageHref(pagination.page + 1)}
                  rel="next"
                  className="rounded-full border border-line bg-surface px-5 py-2 text-sm font-medium hover:border-accent/50 transition-colors"
                >
                  Next →
                </Link>
              ) : null}
            </nav>
          ) : null}

          {items.length > 0 ? (
            <div className="rounded-xl border border-line bg-surface-2/30 p-4">
              <p className="text-xs font-semibold">Why OmniStore is the largest open app store?</p>
              <ul className="mt-2 grid gap-1.5 text-2xs text-muted sm:grid-cols-2">
                <li>• 444 apps, 1,891 releases, 13,357 assets — all validated</li>
                <li>• Direct downloads from GitHub releases — no mirrors</li>
                <li>• Source link on every card — audit before install</li>
                <li>• Cross-platform: Windows, macOS, Linux, Android, iOS</li>
                <li>• AI-powered search with synonyms & typo tolerance</li>
                <li>• Fully automated daily ingest — connected to OmniSource</li>
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
