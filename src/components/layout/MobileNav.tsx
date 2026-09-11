"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Heart, Home, Layers, FolderTree, LayoutGrid, Menu, Users, X } from "lucide-react";

import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", key: "home", icon: Home },
  { href: "/apps", key: "browse", icon: LayoutGrid },
  { href: "/collections", key: "collections", icon: Layers },
  { href: "/categories", key: "categories", icon: FolderTree },
  { href: "/developers", key: "developers", icon: Users },
  { href: "/favorites", key: "favorites", icon: Heart },
] as const;

/** Mobile navigation sheet. */
export function MobileNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("openMenu")}
        aria-expanded={open}
        className="rounded-full border border-line bg-surface p-2 text-muted transition-colors hover:text-fg"
      >
        <Menu className="h-5 w-5" aria-hidden />
      </button>
      {open ? (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label={t("closeMenu")}
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <nav className="absolute inset-y-0 end-0 w-72 max-w-[85vw] border-s border-line bg-bg p-4 shadow-raised">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-semibold">OmniStore</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("closeMenu")}
                className="rounded-full p-2 text-muted hover:bg-surface-2"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <ul className="space-y-1">
              {ITEMS.map(({ href, key, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                        active ? "bg-accent-soft text-accent" : "text-muted hover:bg-surface-2 hover:text-fg",
                      )}
                    >
                      <Icon className="h-4.5 w-4.5" aria-hidden />
                      {t(key)}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 border-t border-line pt-4">
              <Link
                href="/collections/mine"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted hover:bg-surface-2 hover:text-fg"
              >
                <Layers className="h-4.5 w-4.5" aria-hidden />
                {t("collections")}
              </Link>
            </div>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
