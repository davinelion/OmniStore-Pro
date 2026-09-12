"use client";

import Fuse from "fuse.js";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Search, X } from "lucide-react";

import type { App } from "@omnistore/shared-models";
import { getOmnisource } from "@/lib/omnisource";
import { cn } from "@/lib/utils";
import { AppIcon } from "@/components/app/AppIcon";
import { trackEvent } from "@/lib/analytics/client";

const RECENT_KEY = "omnistore:recent-searches";
/** Search terms are populated from OmniSource trending apps at runtime. */
export const POPULAR_SEARCHES: string[] = [];

function readRecent(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string").slice(0, 8) : [];
  } catch {
    return [];
  }
}

function pushRecent(query: string): string[] {
  const trimmed = query.trim().slice(0, 120);
  if (!trimmed) return readRecent();
  const next = [trimmed, ...readRecent().filter((q) => q !== trimmed)].slice(0, 8);
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable */
  }
  return next;
}

/**
 * SearchBox — type-ahead powered by OmniSource's search engine, plus recent
 * (local) and popular searches. Results never re-ranked client-side.
 */
export function SearchBox({
  initialQuery = "",
  autoFocus = false,
  size = "md",
  placeholder,
  className,
  onSearch,
}: {
  initialQuery?: string;
  autoFocus?: boolean;
  size?: "md" | "lg";
  placeholder?: string;
  className?: string;
  onSearch?: (query: string) => void;
}) {
  const t = useTranslations("search");
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<App[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [trending, setTrending] = useState<string[]>([]);
  const listboxId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setRecent(readRecent());
    let mounted = true;
    getOmnisource()
      .getTrending()
      .then((apps) => {
        if (mounted) setTrending(apps.slice(0, 6).map((app) => app.name));
      })
      .catch(() => {
        // Trending is optional decoration; OmniSource remains the source of truth.
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Debounced type-ahead from the engine.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const result = await getOmnisource().search(trimmed, { perPage: 6 }, { signal: controller.signal });
        setSuggestions(result.items);
      } catch {
        // Fuse is only a resilient fallback over a freshly fetched OmniSource
        // corpus; it never ships a local or mock catalog.
        try {
          const live = await getOmnisource().getApps({ perPage: 100 }, { signal: controller.signal });
          const fuse = new Fuse(live.items, {
            keys: ["name", "shortDescription", "developer", "tags"],
            threshold: 0.35,
          });
          setSuggestions(fuse.search(trimmed, { limit: 6 }).map(({ item }) => item));
        } catch {
          /* aborted or offline — keep previous suggestions */
        }
      }
    }, 220);
    return () => clearTimeout(timer);
  }, [query]);

  function submit(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    setRecent(pushRecent(trimmed));
    trackEvent({ type: "search", metadata: { queryLength: trimmed.length } });
    setOpen(false);
    if (onSearch) {
      onSearch(trimmed);
    } else {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  }

  const showPanel = open && (suggestions.length > 0 || recent.length > 0 || query.trim().length < 2);

  return (
    <div ref={boxRef} className={cn("relative", className)}>
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          submit(query);
        }}
      >
        <div
          className={cn(
            "flex items-center gap-2 rounded-full border border-line bg-surface px-4 transition-colors focus-within:border-accent/60",
            size === "lg" ? "h-13 py-2.5" : "h-10",
          )}
        >
          <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder ?? t("placeholder")}
            aria-label={t("title")}
            aria-controls={listboxId}
            aria-expanded={showPanel}
            role="combobox"
            autoComplete="off"
            autoFocus={autoFocus}
            className={cn(
              "min-w-0 flex-1 bg-transparent outline-none placeholder:text-subtle",
              size === "lg" ? "text-base" : "text-sm",
            )}
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setSuggestions([]);
              }}
              aria-label={t("clear")}
              className="rounded-full p-1 text-muted hover:bg-surface-2 hover:text-fg"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
        </div>
      </form>

      {showPanel ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label={t("suggestions")}
          className="absolute inset-x-0 top-full z-50 mt-2 max-h-[26rem] overflow-auto rounded-2xl border border-line bg-surface p-2 shadow-raised"
        >
          {suggestions.length > 0 ? (
            <div className="space-y-0.5">
              <p className="px-2 pb-1 pt-1.5 text-2xs font-semibold uppercase tracking-wide text-subtle">
                {t("suggestions")}
              </p>
              {suggestions.map((app) => (
                <button
                  key={app.id}
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => {
                    setOpen(false);
                    if (onSearch) onSearch(app.name);
                    router.push(`/app/${app.slug}`);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-start hover:bg-surface-2"
                >
                  <AppIcon name={app.name} src={app.icon} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{app.name}</span>
                    <span className="block truncate text-xs text-muted">
                      {app.shortDescription || app.developer}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          {recent.length > 0 ? (
            <div className="space-y-0.5 border-t border-line pt-1.5 mt-1">
              <div className="flex items-center justify-between px-2 pb-1 pt-1">
                <p className="text-2xs font-semibold uppercase tracking-wide text-subtle">
                  {t("recent")}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      window.localStorage.removeItem(RECENT_KEY);
                    } catch {
                      /* ignore */
                    }
                    setRecent([]);
                  }}
                  className="text-2xs text-muted hover:text-fg hover:underline"
                >
                  {t("clearRecent")}
                </button>
              </div>
              {recent.map((item) => (
                <button
                  key={item}
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => submit(item)}
                  className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-start text-sm hover:bg-surface-2"
                >
                  <Search className="h-3.5 w-3.5 text-subtle" aria-hidden />
                  <span className="truncate">{item}</span>
                </button>
              ))}
            </div>
          ) : null}

          <div className="space-y-0.5 border-t border-line pt-1.5 mt-1">
            <p className="px-2 pb-1 pt-1 text-2xs font-semibold uppercase tracking-wide text-subtle">
              {t("popular")}
            </p>
            {(trending.length > 0 ? trending : POPULAR_SEARCHES).map((item) => (
              <button
                key={item}
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => submit(item)}
                className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-start text-sm hover:bg-surface-2"
              >
                <Search className="h-3.5 w-3.5 text-subtle" aria-hidden />
                <span className="truncate">{item}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
