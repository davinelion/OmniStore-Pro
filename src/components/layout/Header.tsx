"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Layers, Menu, Search, X } from "lucide-react";

import { ThemeToggle } from "./ThemeToggle";
import { LocaleSwitcher } from "./I18nProvider";
import { useI18n } from "./I18nProvider";
import { cn } from "@/lib/utils";

const NAV = [
  { key: "nav.discover", href: "/" },
  { key: "nav.apps", href: "/apps" },
  { key: "nav.categories", href: "/categories" },
  { key: "nav.platforms", href: "/platforms" },
  { key: "nav.alternatives", href: "/alternatives" },
  { key: "nav.updates", href: "/updates" },
  { key: "nav.library", href: "/library" },
  { key: "nav.compare", href: "/compare" },
] as const;

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search");
    setMenuOpen(false);
  }

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-content items-center gap-2 px-4 sm:gap-4">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 rounded-lg font-semibold tracking-tight"
          aria-label="OmniStore home"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-accent-fg">
            <Layers className="h-4 w-4" aria-hidden />
          </span>
          <span className="hidden text-base sm:inline">OmniStore</span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm transition-colors",
                isActive(item.href) ? "bg-surface-2 text-fg" : "text-fg-muted hover:bg-surface-2 hover:text-fg",
              )}
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        <form onSubmit={submit} role="search" className="ml-auto flex min-w-0 flex-1 justify-end lg:max-w-sm">
          <div className="flex w-full items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 focus-within:border-accent/60">
            <Search className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
            <input
              type="search"
              name="q"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("hero.searchPlaceholder")}
              aria-label={t("hero.searchLabel")}
              className="min-w-0 w-full bg-transparent text-sm outline-none placeholder:text-fg-subtle"
            />
          </div>
        </form>

        <ThemeToggle className="hidden sm:inline-flex" />

        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line lg:hidden"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={menuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X className="h-4 w-4" aria-hidden /> : <Menu className="h-4 w-4" aria-hidden />}
        </button>
      </div>

      {menuOpen ? (
        <div
          id="mobile-menu"
          ref={menuRef}
          className="border-t border-line bg-surface px-4 py-3 lg:hidden"
        >
          <nav aria-label="Mobile" className="flex flex-col">
            {[...NAV, { key: "nav.favorites", href: "/favorites" }, { key: "nav.developers", href: "/developers" }].map(
              (item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-lg px-3 py-2.5 text-sm",
                    isActive(item.href) ? "bg-surface-2 font-medium" : "text-fg-muted",
                  )}
                >
                  {t(item.key)}
                </Link>
              ),
            )}
          </nav>
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </div>
      ) : null}
    </header>
  );
}
