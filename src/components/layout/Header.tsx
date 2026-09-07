"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, Menu, X } from "lucide-react";
import { useState } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Discover" },
  { href: "/apps", label: "Apps" },
  { href: "/categories", label: "Categories" },
  { href: "/platforms", label: "Platforms" },
  { href: "/trending", label: "Trending" },
  { href: "/latest", label: "Latest" },
  { href: "/collections", label: "Collections" },
  { href: "/compare", label: "Compare" },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--bg)]/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <Link href="/" className="font-display text-lg font-semibold tracking-tight">
          OmniStore
        </Link>
        <nav className="hidden items-center gap-3 lg:flex" aria-label="Primary">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "text-sm text-[var(--muted)] hover:text-[var(--fg)]",
                pathname === l.href && "text-[var(--fg)] font-medium"
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <form
          className="ml-auto flex min-w-0 flex-1 items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--card)] px-3 py-1.5 lg:max-w-sm"
          onSubmit={(e) => {
            e.preventDefault();
            router.push(`/search?q=${encodeURIComponent(q)}`);
          }}
        >
          <Search className="h-4 w-4 shrink-0 text-[var(--muted)]" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search apps, licenses, platforms"
            className="w-full bg-transparent text-sm outline-none"
            aria-label="Search"
          />
        </form>
        <ThemeToggle />
        <button
          className="lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <nav className="flex flex-col gap-2 border-t border-[var(--line)] px-4 py-3 lg:hidden" aria-label="Mobile">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
