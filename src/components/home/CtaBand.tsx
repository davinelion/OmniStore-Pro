import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, GitBranch } from "lucide-react";

import { sectionSlug } from "@/lib/section";

/**
 * CtaBand — the closing call to action: a saturated brand-gradient panel
 * with grain, offering the two primary journeys (browse / track).
 */
export function CtaBand() {
  const t = useTranslations("home");

  return (
    <section
      aria-labelledby={sectionSlug(t("ctaTitle"))}
      className="relative isolate overflow-hidden rounded-4xl border border-accent/30 bg-brand-gradient px-6 py-14 text-center sm:px-12 sm:py-16"
    >
      {/* Texture + light: keeps the saturated gradient from feeling flat. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="bg-noise absolute inset-0 opacity-[0.08] mix-blend-overlay" />
        <div
          className="absolute -top-24 left-1/2 h-64 w-[36rem] max-w-full -translate-x-1/2 rounded-full bg-white/25 blur-3xl"
        />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
      </div>

      <h2
        id={sectionSlug(t("ctaTitle"))}
        className="mx-auto max-w-2xl font-display text-3xl font-bold tracking-tight text-white sm:text-5xl"
      >
        {t("ctaTitle")}
      </h2>
      <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
        {t("ctaSubtitle")}
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/apps"
          className={
            "group inline-flex h-12 items-center gap-2 rounded-full bg-white px-7 text-sm font-semibold " +
            "text-slate-900 shadow-raised transition-transform duration-200 ease-spring hover:-translate-y-0.5"
          }
        >
          {t("ctaBrowse")}
          <ArrowRight
            className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
            aria-hidden
          />
        </Link>
        <Link
          href="/track"
          className={
            "inline-flex h-12 items-center gap-2 rounded-full border border-white/40 bg-white/10 px-7 " +
            "text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
          }
        >
          <GitBranch className="h-4 w-4" aria-hidden />
          {t("ctaTrack")}
        </Link>
      </div>
    </section>
  );
}
