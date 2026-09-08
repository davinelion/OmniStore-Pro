"use client";

import Link from "next/link";
import { Github } from "lucide-react";

import { useI18n } from "./I18nProvider";
import { LocaleSwitcher } from "./I18nProvider";
import { site } from "@/config/site";

export function Footer() {
  const { t } = useI18n();

  const columns = [
    {
      title: "OmniStore",
      links: [
        { label: t("footer.about"), href: "/about" },
        { label: t("footer.documentation"), href: "/docs" },
        { label: t("nav.developers"), href: "/developers" },
        { label: t("nav.collections"), href: "/collections" },
      ],
    },
    {
      title: t("nav.discover"),
      links: [
        { label: t("nav.trending"), href: "/trending" },
        { label: t("nav.latest"), href: "/latest" },
        { label: t("nav.compare"), href: "/compare" },
        { label: "Cross-Platform", href: "/discover/cross-platform" },
      ],
    },
    {
      title: t("footer.openSource"),
      links: [
        { label: t("footer.github"), href: site.repoUrl, external: true },
        { label: t("footer.omnisource"), href: site.omnisourceRepoUrl, external: true },
        { label: t("footer.report"), href: "/report" },
        { label: t("footer.privacy"), href: "/privacy" },
        { label: t("footer.terms"), href: "/terms" },
      ],
    },
  ];

  return (
    <footer className="mt-20 border-t border-line bg-surface/40">
      <div className="mx-auto max-w-content px-4 py-12">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <p className="font-semibold">OmniStore</p>
            <p className="mt-2 max-w-sm text-sm text-muted">{t("footer.disclaimer")}</p>
            <p className="mt-4 text-2xs text-fg-subtle">
              {t("footer.madeWith")} · v{site.version}
            </p>
            <div className="mt-4">
              <LocaleSwitcher />
            </div>
          </div>

          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <p className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">{column.title}</p>
              <ul className="mt-3 space-y-2">
                {column.links.map((link) => (
                  <li key={link.href}>
                    {"external" in link && link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer external"
                        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-fg"
                      >
                        {link.label === t("footer.github") ? <Github className="h-3.5 w-3.5" aria-hidden /> : null}
                        {link.label}
                      </a>
                    ) : (
                      <Link href={link.href} className="text-sm text-muted transition-colors hover:text-fg">
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>
    </footer>
  );
}
