"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, Compass, Home, LayoutGrid, Search } from "lucide-react";

import { useI18n } from "./I18nProvider";
import { cn } from "@/lib/utils";

/**
 * Mobile primary navigation.
 *
 * Designed for thumb reach on a phone-sized viewport rather than as a shrunken
 * desktop bar, with 44px minimum targets.
 */
const ITEMS = [
  { href: "/", key: "nav.home", icon: Home },
  { href: "/trending", key: "nav.discover", icon: Compass },
  { href: "/search", key: "nav.search", icon: Search },
  { href: "/categories", key: "nav.categories", icon: LayoutGrid },
  { href: "/favorites", key: "nav.favorites", icon: Bookmark },
] as const;

export function MobileNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <nav
      aria-label="Mobile primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 backdrop-blur-xl md:hidden"
    >
      <ul className="mx-auto flex max-w-content items-stretch justify-around px-2 py-1.5 safe-bottom">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-2xs transition-colors",
                  active ? "text-accent" : "text-fg-subtle",
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
                {t(item.key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
