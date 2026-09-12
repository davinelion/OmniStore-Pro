"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Apple,
  ArrowRight,
  GitBranch,
  Laptop,
  Monitor,
  Smartphone,
  Terminal,
} from "lucide-react";

import { entrance, motion, usePrefersReducedMotion } from "@/lib/motion";
import { SOURCE_LABELS } from "@/lib/sources";
import { HeroSearch } from "./HeroSearch";
import { HeroStats } from "./HeroStats";
import { AppMarquee } from "./AppMarquee";

/**
 * HeroBanner — the storefront's front door.
 *
 * Fully API-driven: the counters come from OmniSource's stats endpoint, the
 * ribbon below shows real trending apps, and every CTA points at a real
 * catalog route. No hardcoded app data.
 */

const PLATFORM_CHIPS = [
  { slug: "android", label: "Android", Icon: Smartphone },
  { slug: "ios", label: "iOS", Icon: Apple },
  { slug: "windows", label: "Windows", Icon: Monitor },
  { slug: "macos", label: "macOS", Icon: Laptop },
  { slug: "linux", label: "Linux", Icon: Terminal },
] as const;

export interface HeroStatsInput {
  apps: number;
  releases: number;
  platforms: number;
  repositories: number;
}

export function HeroBanner({
  stats,
  marqueeApps,
  marqueeLabel,
}: {
  stats?: HeroStatsInput | null;
  marqueeApps?: Parameters<typeof AppMarquee>[0]["apps"];
  marqueeLabel?: string;
}) {
  const t = useTranslations("home");
  const tStats = useTranslations("stats");
  const reduce = usePrefersReducedMotion();
  const anim = (delay: number) => (reduce ? {} : entrance(delay));

  const sources = Object.values(SOURCE_LABELS).filter((label) => label !== "Other");

  return (
    <section className="relative isolate overflow-hidden rounded-4xl border border-line/80">
      {/* ---------------------------------------------------------------- */}
      {/* Backdrop: layered aurora + grid + grain. Purely decorative.        */}
      {/* ---------------------------------------------------------------- */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        {/* Base wash */}
        <div className="absolute inset-0 bg-gradient-to-b from-surface/80 via-surface/40 to-transparent" />
        {/* Violet bloom, top-left */}
        <div className="aurora-blob animate-aurora bg-accent/25 dark:bg-accent/30"
          style={{ top: "-12rem", left: "-8rem", width: "34rem", height: "34rem" }}
        />
        {/* Cyan bloom, top-right */}
        <div className="aurora-blob animate-aurora bg-accent-2/20 dark:bg-accent-2/25"
          style={{ top: "-10rem", right: "-8rem", width: "30rem", height: "30rem", animationDelay: "-8s" }}
        />
        {/* Centre conic sheen behind the headline */}
        <div
          className="animate-glow-breathe absolute left-1/2 top-0 h-72 w-[42rem] max-w-full -translate-x-1/2 -translate-y-1/3 rounded-full opacity-60"
          style={{
            background:
              "radial-gradient(closest-side, rgb(var(--accent) / 0.22), rgb(var(--accent-2) / 0.1) 55%, transparent 75%)",
          }}
        />
        {/* Technical grid, faded by a radial mask */}
        <div className="bg-grid absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_top,black,transparent_72%)]" />
        {/* Fine grain */}
        <div className="bg-noise absolute inset-0 opacity-[0.05] mix-blend-overlay" />
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Content                                                            */}
      {/* ---------------------------------------------------------------- */}
      <div className="relative px-5 pb-0 pt-14 sm:px-10 sm:pt-20">
        <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
          <motion.span
            {...anim(0)}
            className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3.5 py-1.5 text-xs font-medium text-accent"
          >
            <span className="relative flex h-2 w-2" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            {t("heroBadge")}
          </motion.span>

          <motion.h1
            {...anim(0.05)}
            className="mt-6 font-display text-[2.6rem] font-bold leading-[1.04] tracking-[-0.03em] sm:text-6xl lg:text-7xl"
          >
            <span className="block text-fg">{t("heroTitleLine1")}</span>
            <span className="text-gradient-brand mt-1 block">{t("heroTitleLine2")}</span>
          </motion.h1>

          <motion.p
            {...anim(0.1)}
            className="mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg"
          >
            {t("heroSubtitle")}
          </motion.p>

          <HeroSearch delay={0.15} />

          <motion.div {...anim(0.2)} className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/apps"
              className="group inline-flex h-11 items-center gap-2 rounded-full bg-brand-gradient px-6 text-sm font-semibold text-white shadow-raised transition-transform duration-200 ease-spring hover:-translate-y-0.5 hover:shadow-glow"
            >
              {t("ctaBrowse")}
              <ArrowRight
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
            <Link
              href="/track"
              className="inline-flex h-11 items-center gap-2 rounded-full border border-line bg-surface/70 px-6 text-sm font-semibold text-fg backdrop-blur-sm transition-colors hover:border-accent/60 hover:bg-surface-2"
            >
              <GitBranch className="h-4 w-4 text-muted" aria-hidden />
              {t("ctaTrack")}
            </Link>
          </motion.div>

          {/* Platform chips — real catalog filters. */}
          <motion.nav {...anim(0.25)} aria-label="Platforms" className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {PLATFORM_CHIPS.map(({ slug, label, Icon }) => (
              <Link
                key={slug}
                href={`/apps?platform=${slug}`}
                className={
                  "inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/60 px-3.5 py-1.5 " +
                  "text-xs font-medium text-muted backdrop-blur-sm transition-colors hover:border-accent/50 hover:text-fg"
                }
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {label}
              </Link>
            ))}
          </motion.nav>

          {stats ? (
            <HeroStats
              stats={[
                { value: stats.apps, label: tStats("apps") },
                { value: stats.releases, label: tStats("releases") },
                { value: stats.platforms, label: tStats("platforms") },
                { value: stats.repositories, label: tStats("repositories") },
              ]}
            />
          ) : null}
        </div>

        {/* Source provenance — small, quiet, honest. */}
        <motion.div
          {...anim(0.3)}
          className="mx-auto mt-12 flex max-w-3xl flex-wrap items-center justify-center gap-2 border-t border-line/70 px-4 pb-8 pt-6"
        >
          <span className="inline-flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-[0.14em] text-subtle">
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

      {/* Live ribbon of catalog apps, bleeding to the panel edges. */}
      {marqueeApps && marqueeApps.length > 0 ? (
        <div className="border-t border-line/70 bg-surface/30 px-5 py-6 backdrop-blur-sm sm:px-10">
          {marqueeLabel ? (
            <p className="mb-4 text-center text-2xs font-semibold uppercase tracking-[0.14em] text-subtle">
              {marqueeLabel}
            </p>
          ) : null}
          <AppMarquee apps={marqueeApps} label={marqueeLabel ?? t("trending")} />
        </div>
      ) : null}
    </section>
  );
}
