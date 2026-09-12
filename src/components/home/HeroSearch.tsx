"use client";

import { useTranslations } from "next-intl";
import { Search } from "lucide-react";

import { entrance, motion, usePrefersReducedMotion } from "@/lib/motion";

/**
 * HeroSearch — the storefront's front door.
 *
 * Renders as a large, input-styled button that hands the user straight into
 * the command palette (⌘K), which owns the actual query, results and keyboard
 * navigation. Kept as a button — not a real input — so there is exactly one
 * search surface and zero duplicate query state.
 */
export function HeroSearch({ delay = 0 }: { delay?: number }) {
  const t = useTranslations("search");
  const reduce = usePrefersReducedMotion();
  const anim = reduce ? {} : entrance(delay);

  const openPalette = () => {
    window.dispatchEvent(new Event("omnistore:open-palette"));
  };

  return (
    <motion.div {...anim} className="mx-auto mt-8 w-full max-w-xl">
      <button
        type="button"
        onClick={openPalette}
        className={
          "group flex w-full items-center gap-3 rounded-2xl border border-line-strong/60 bg-surface/80 " +
          "px-5 py-4 text-left shadow-raised backdrop-blur-xl transition-all duration-200 ease-spring " +
          "hover:border-accent/60 hover:shadow-glow focus-visible:border-accent/60 focus-visible:shadow-glow"
        }
        aria-label={t("title")}
      >
        <span
          className={
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl " +
            "bg-gradient-to-br from-accent/15 to-accent-2/15 text-accent " +
            "transition-transform duration-200 group-hover:scale-105"
          }
        >
          <Search className="h-5 w-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1 truncate text-[0.95rem] text-subtle transition-colors group-hover:text-muted">
          {t("placeholder")}
        </span>
        <kbd
          className={
            "hidden shrink-0 items-center gap-1 rounded-lg border border-line bg-surface-2 px-2 py-1 " +
            "font-sans text-xs text-subtle sm:flex"
          }
        >
          <span aria-hidden>⌘</span>
          <span aria-hidden>K</span>
        </kbd>
      </button>
    </motion.div>
  );
}
