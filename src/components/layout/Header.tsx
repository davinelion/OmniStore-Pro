"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { SearchBox } from "@/components/search/SearchBox";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MobileNav } from "./MobileNav";

const NAV = [
  { href: "/apps", key: "browse" },
  { href: "/collections", key: "collections" },
  { href: "/categories", key: "categories" },
  { href: "/developers", key: "developers" },
] as const;

export function Header() {
  const t = useTranslations("nav");

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-content items-center gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 rounded-lg font-semibold tracking-tight"
          aria-label="OmniStore home"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-accent-fg text-sm font-bold">
            O
          </span>
          <span className="hidden text-[1.05rem] sm:block">OmniStore</span>
        </Link>

        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="rounded-full px-3 py-1.5 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-fg"
                >
                  {t(item.key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mx-auto hidden w-full max-w-md md:block">
          <SearchBox />
        </div>

        <div className="ms-auto flex items-center gap-2">
          <div className="hidden md:block">
            <ThemeToggle />
          </div>
          <div className="hidden sm:block">
            <LanguageSwitcher compact />
          </div>
          <Link
            href="/favorites"
            className={cn(
              "hidden rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-muted",
              "transition-colors hover:border-accent/50 hover:text-fg sm:block",
            )}
          >
            {t("favorites")}
          </Link>
          <MobileNav />
        </div>
      </div>
      <div className="border-t border-line px-4 py-2 md:hidden">
        <SearchBox />
      </div>
    </header>
  );
}
