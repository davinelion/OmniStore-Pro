"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Home, Search, LayoutGrid, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/trending", label: "Discover", icon: Compass },
  { href: "/search", label: "Search", icon: Search },
  { href: "/categories", label: "Categories", icon: LayoutGrid },
  { href: "/about", label: "More", icon: MoreHorizontal },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[var(--bg)] px-2 py-2 md:hidden"
      aria-label="Mobile primary"
    >
      <ul className="flex justify-around">
        {items.map((i) => {
          const Icon = i.icon;
          const active = pathname === i.href;
          return (
            <li key={i.href}>
              <Link
                href={i.href}
                className={cn(
                  "flex flex-col items-center gap-1 text-xs text-[var(--muted)]",
                  active && "text-[var(--fg)]"
                )}
              >
                <Icon className="h-5 w-5" />
                {i.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
