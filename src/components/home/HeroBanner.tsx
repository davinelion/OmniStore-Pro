"use client";

import { useTranslations } from "next-intl";

import { entrance, motion, usePrefersReducedMotion } from "@/lib/motion";
import { ButtonLink } from "@/components/ui/button";

/**
 * HeroBanner — the API-driven storefront hero. All copy is i18n; the CTA
 * targets are real catalog routes.
 */
export function HeroBanner({
  stats,
}: {
  stats?: { apps: number; platforms: number } | null;
}) {
  const t = useTranslations("home");
  const reduce = usePrefersReducedMotion();
  const anim = (delay: number) => (reduce ? {} : entrance(delay));

  return (
    <section className="relative overflow-hidden rounded-4xl border border-line bg-gradient-to-br from-accent-soft via-surface to-surface p-6 sm:p-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/10 blur-3xl"
      />
      <div className="relative max-w-2xl">
        <motion.span
          {...anim(0)}
          className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-surface/70 px-3 py-1 text-xs font-medium text-accent"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
          {t("heroBadge")}
        </motion.span>
        <motion.h1
          {...anim(0.05)}
          className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl"
        >
          {t("heroTitle")}
        </motion.h1>
        <motion.p
          {...anim(0.1)}
          className="mt-3 text-base text-muted sm:text-lg"
        >
          {t("heroSubtitle")}
        </motion.p>
        <motion.div
          {...anim(0.15)}
          className="mt-6 flex flex-wrap items-center gap-3"
        >
          <ButtonLink href="/apps" size="lg">
            {t("ctaBrowse")}
          </ButtonLink>
          <ButtonLink href="/search" variant="outline" size="lg">
            {t("ctaSearch")}
          </ButtonLink>
        </motion.div>
        {stats ? (
          <p className="mt-5 text-sm text-subtle tabular-nums">
            {stats.apps.toLocaleString()} apps · {stats.platforms} platforms
          </p>
        ) : null}
      </div>
    </section>
  );
}
