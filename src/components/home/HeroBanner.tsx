"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, GitBranch, Sparkles } from "lucide-react";

import { entrance, motion, usePrefersReducedMotion } from "@/lib/motion";
import { SOURCE_LABELS } from "@/lib/sources";

/**
 * HeroBanner — the storefront's front door.
 *
 * Fully API-driven: the counters come from OmniSource's stats endpoint and
 * every CTA points at a real catalog route. No hardcoded app data.
 */
export function HeroBanner({
  stats,
}: {
  stats?: { apps: number; platforms: number } | null;
}) {
  const t = useTranslations("home");
  const tTrack = useTranslations("track");
  const reduce = usePrefersReducedMotion();
  const anim = (delay: number) => (reduce ? {} : entrance(delay));

  const sources = Object.values(SOURCE_LABELS).filter((label) => label !== "Other");

  return (
    <section className="relative isolate overflow-hidden rounded-4xl border border-line/80 bg-surface/50 backdrop-blur-sm">
      {/* Aurora wash + technical grid, purely decorative. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-accent/30 blur-3xl" />
        <div className="absolute -right-20 -top-10 h-72 w-72 rounded-full bg-accent-2/25 blur-3xl" />
        <div className="bg-grid absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
      </div>

      <div className="relative px-6 py-12 sm:px-10 sm:py-16">
        <motion.span
          {...anim(0)}
          className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent"
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          {t("heroBadge")}
        </motion.span>

        <motion.h1
          {...anim(0.05)}
          className="mt-5 max-w-3xl text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl"
        >
          <span className="text-gradient">{t("heroTitle")}</span>
        </motion.h1>

        <motion.p
          {...anim(0.1)}
          className="mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg"
        >
          {t("heroSubtitle")}
        </motion.p>

        <motion.div {...anim(0.15)} className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/apps"
            className="group inline-flex h-12 items-center gap-2 rounded-full bg-brand-gradient px-6 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            {t("ctaBrowse")}
            <ArrowRight
              className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
          <Link
            href="/track"
            className="inline-flex h-12 items-center gap-2 rounded-full border border-line bg-surface/60 px-6 text-sm font-semibold backdrop-blur-sm transition-colors hover:border-accent/60 hover:bg-surface-2"
          >
            <GitBranch className="h-4 w-4" aria-hidden />
            {t("ctaTrack")}
          </Link>
        </motion.div>

        {stats ? (
          <motion.dl {...anim(0.2)} className="mt-8 flex flex-wrap gap-2">
            <StatPill value={stats.apps.toLocaleString()} label={t("statApps")} />
            <StatPill value={String(stats.platforms)} label={t("statPlatforms")} />
          </motion.dl>
        ) : null}

        <motion.div
          {...anim(0.25)}
          className="mt-8 flex flex-wrap items-center gap-2 border-t border-line/70 pt-5"
        >
          <span className="inline-flex items-center gap-1.5 text-2xs uppercase tracking-wider text-subtle">
            <GitBranch className="h-3 w-3" aria-hidden />
            {t("indexedFrom")}
          </span>
          {sources.map((label) => (
            <span key={label} className="chip">
              {label}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <div className="inline-flex items-baseline gap-1.5 rounded-full border border-line bg-surface/60 px-3.5 py-1.5 backdrop-blur-sm">
      <dt className="sr-only">{label}</dt>
      <dd className="text-sm font-semibold tabular">{value}</dd>
      <span aria-hidden className="text-xs text-subtle">
        {label}
      </span>
    </div>
  );
}
