"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowUpRight, CornerDownLeft, Loader2, Search, X } from "lucide-react";

import type { App } from "@omnistore/shared-models";
import { getOmnisource } from "@/lib/omnisource";
import { cn } from "@/lib/utils";
import { AppIcon } from "@/components/app/AppIcon";

type PaletteItem =
  | { kind: "app"; id: string; label: string; hint: string; href: string; icon: string | null }
  | { kind: "link"; id: string; label: string; href: string; hint: string };

const QUICK_LINKS: ReadonlyArray<{ href: string; key: string }> = [
  { href: "/apps", key: "browse" },
  { href: "/track", key: "track" },
  { href: "/collections", key: "collections" },
  { href: "/categories", key: "categories" },
  { href: "/developers", key: "developers" },
  { href: "/favorites", key: "favorites" },
];

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable
  );
}

/**
 * CommandPalette — ⌘K / Ctrl+K search over the whole OmniSource catalog.
 *
 * Results come straight from the OmniSource search engine (same endpoint the
 * search page uses) and are never re-ranked here. Navigation is fully
 * keyboard-driven with a roving `aria-activedescendant` selection.
 */
export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("search");
  const tNav = useTranslations("nav");
  const router = useRouter();
  const listboxId = useId();
  const optionId = (index: number) => `${listboxId}-option-${index}`;

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<App[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  /* ---------------------------------------------------------------- */
  /* Global shortcut: ⌘K / Ctrl+K, and "/" when not already typing    */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (isShortcut) {
        event.preventDefault();
        onOpenChange(!open);
        return;
      }
      if (event.key === "/" && !open && !isTypingTarget(event.target)) {
        event.preventDefault();
        onOpenChange(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  /* ---------------------------------------------------------------- */
  /* Body scroll lock + autofocus                                      */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (!open) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => {
      document.body.style.overflow = overflow;
      window.clearTimeout(timer);
    };
  }, [open]);

  /* ---------------------------------------------------------------- */
  /* Debounced search against OmniSource                               */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = window.setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const result = await getOmnisource().search(trimmed, { perPage: 8 }, { signal: controller.signal });
        if (!controller.signal.aborted) {
          setResults(result.items);
          setActive(0);
        }
      } catch {
        /* aborted or offline — keep the previous result set */
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 200);

    return () => window.clearTimeout(timer);
  }, [query, open]);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  const items = useMemo<PaletteItem[]>(() => {
    const trimmed = query.trim().toLowerCase();
    const links: PaletteItem[] = QUICK_LINKS.filter(
      (link) => !trimmed || tNav(link.key).toLowerCase().includes(trimmed),
    ).map((link) => ({
      kind: "link" as const,
      id: `link:${link.href}`,
      label: tNav(link.key),
      href: link.href,
      hint: link.href,
    }));

    const apps: PaletteItem[] = results.slice(0, 8).map((app) => ({
      kind: "app" as const,
      id: `app:${app.id}`,
      label: app.name,
      hint: app.shortDescription || app.developer,
      href: `/app/${app.slug}`,
      icon: app.icon,
    }));

    return [...apps, ...links];
  }, [query, results, tNav]);

  // Keep the highlighted row inside the visible result list.
  useEffect(() => {
    setActive((current) => Math.min(current, Math.max(items.length - 1, 0)));
  }, [items.length]);

  const go = useCallback(
    (item: PaletteItem | undefined) => {
      if (!item) return;
      close();
      setQuery("");
      setResults([]);
      router.push(item.href);
    },
    [close, router],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh] sm:pt-[16vh]">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md animate-fade-in"
        onClick={close}
        aria-hidden
        data-testid="command-palette-backdrop"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("title")}
        className={cn(
          "relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-line/80 shadow-glass animate-scale-in",
          "bg-surface/95 backdrop-blur-2xl",
        )}
      >
        {/* Search field */}
        <div className="flex items-center gap-3 border-b border-line px-4">
          {loading ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted" aria-hidden />
          ) : (
            <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden />
          )}
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={items.length > 0 ? optionId(active) : undefined}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActive((current) => (current + 1) % Math.max(items.length, 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActive((current) => (current - 1 + Math.max(items.length, 1)) % Math.max(items.length, 1));
              } else if (event.key === "Enter") {
                event.preventDefault();
                go(items[active]);
              } else if (event.key === "Escape") {
                event.preventDefault();
                close();
              }
            }}
            placeholder={t("placeholder")}
            aria-label={t("title")}
            autoComplete="off"
            className="h-14 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-subtle"
          />
          <button
            type="button"
            onClick={close}
            aria-label={t("close")}
            className="shrink-0 rounded-full p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label={t("suggestions")}
          className="max-h-[52vh] overflow-y-auto p-2"
        >
          {items.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted">
              {query.trim().length < 2 ? t("paletteHint") : t("noResults")}
            </p>
          ) : null}

          {items.some((item) => item.kind === "app") ? (
            <SectionLabel>{t("suggestions")}</SectionLabel>
          ) : null}
          {items.map((item, index) =>
            item.kind === "app" ? (
              <button
                key={item.id}
                id={optionId(index)}
                type="button"
                role="option"
                aria-selected={index === active}
                onMouseEnter={() => setActive(index)}
                onClick={() => go(item)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start transition-colors",
                  index === active ? "bg-surface-2" : "hover:bg-surface-2/60",
                )}
              >
                <AppIcon name={item.label} src={item.icon} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{item.label}</span>
                  <span className="block truncate text-xs text-muted">{item.hint}</span>
                </span>
                {index === active ? (
                  <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-subtle" aria-hidden />
                ) : null}
              </button>
            ) : null,
          )}

          {items.some((item) => item.kind === "link") ? (
            <SectionLabel>{t("jumpTo")}</SectionLabel>
          ) : null}
          {items.map((item, index) =>
            item.kind === "link" ? (
              <button
                key={item.id}
                id={optionId(index)}
                type="button"
                role="option"
                aria-selected={index === active}
                onMouseEnter={() => setActive(index)}
                onClick={() => go(item)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-start transition-colors",
                  index === active ? "bg-surface-2" : "hover:bg-surface-2/60",
                )}
              >
                <ArrowUpRight className="h-4 w-4 shrink-0 text-subtle" aria-hidden />
                <span className="flex-1 truncate text-sm">{item.label}</span>
                <span className="shrink-0 font-mono text-2xs text-subtle">{item.hint}</span>
                {index === active ? (
                  <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-subtle" aria-hidden />
                ) : null}
              </button>
            ) : null,
          )}
        </div>

        {/* Footer hints */}
        <div className="flex items-center justify-between gap-4 border-t border-line px-4 py-2.5 text-2xs text-subtle">
          <span className="flex items-center gap-3">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
            <span>{t("paletteNavigate")}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>↵</Kbd>
            <span>{t("paletteSelect")}</span>
            <Kbd className="ms-2">esc</Kbd>
          </span>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pb-1 pt-2 text-2xs font-semibold uppercase tracking-wider text-subtle">
      {children}
    </p>
  );
}

function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded border border-line bg-surface-2 px-1.5 font-sans text-2xs text-muted",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
