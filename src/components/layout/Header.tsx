"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/Logo";
import { CommandPalette } from "@/components/search/CommandPalette";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MobileNav } from "./MobileNav";

const NAV = [
  { href: "/apps", key: "browse" },
  { href: "/track", key: "track" },
  { href: "/collections", key: "collections" },
  { href: "/categories", key: "categories" },
  { href: "/developers", key: "developers" },
] as const;

export function Header() {
  const t = useTranslations("nav");
  const tSearch = useTranslations("search");
  const pathname = usePathname() ?? "/";
  const [paletteOpen, setPaletteOpen] = useState(false);

  // The hero (and future surfaces) open the palette through a window event,
  // keeping palette state owned by the header without prop drilling.
  useEffect(() => {
    const openPalette = () => setPaletteOpen(true);
    window.addEventListener("omnistore:open-palette", openPalette);
    return () => window.removeEventListener("omnistore:open-palette", openPalette);
  }, []);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line/70 bg-bg/70 backdrop-blur-xl supports-[backdrop-filter]:bg-bg/60">
        <div className="mx-auto flex h-16 max-w-content items-center gap-2 px-4 sm:px-6">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2.5 rounded-lg font-semibold tracking-tight"
            aria-label="OmniStore home"
          >
            <Logo size={30} className="rounded-[9px] shadow-glow" />
            <span className="hidden font-display text-[1.05rem] font-bold tracking-tight sm:block">
              OmniStore
            </span>
          </Link>

          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex items-center gap-0.5">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className={cn(
                      "relative rounded-full px-3 py-1.5 text-sm transition-colors",
                      isActive(item.href)
                        ? "text-fg"
                        : "text-muted hover:bg-surface-2/70 hover:text-fg",
                    )}
                  >
                    {t(item.key)}
                    {isActive(item.href) ? (
                      <span
                        aria-hidden
                        className="absolute inset-x-3 -bottom-[13px] h-px bg-brand-gradient"
                      />
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Search trigger — the palette owns the actual input. */}
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className={cn(
              "group ms-auto flex h-9 w-9 items-center justify-center rounded-full border border-line",
              "bg-surface-2/50 text-muted transition-colors hover:border-accent/50 hover:text-fg",
              "md:ms-4 md:h-10 md:w-full md:max-w-xs md:justify-start md:gap-2 md:px-3.5",
            )}
            aria-label={tSearch("title")}
          >
            <Search className="h-4 w-4 shrink-0" aria-hidden />
            <span className="hidden flex-1 text-start text-sm text-subtle md:block">
              {tSearch("placeholder")}
            </span>
            <kbd className="hidden shrink-0 items-center gap-0.5 rounded border border-line bg-surface px-1.5 py-0.5 font-sans text-2xs text-subtle md:flex">
              <span aria-hidden>⌘</span>K
            </kbd>
          </button>

          <div className="flex items-center gap-1.5 md:gap-2">
            <Link
              href="/favorites"
              className={cn(
                "hidden rounded-full border border-line bg-surface-2/50 px-3 py-1.5 text-sm text-muted",
                "transition-colors hover:border-accent/50 hover:text-fg sm:block",
              )}
            >
              {t("favorites")}
            </Link>
            <div className="hidden md:block">
              <ThemeToggle />
            </div>
            <div className="hidden sm:block">
              <LanguageSwitcher compact />
            </div>
            <MobileNav />
          </div>
        </div>
      </header>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </>
  );
}
