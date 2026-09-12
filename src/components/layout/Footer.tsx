import Link from "next/link";
import { useTranslations } from "next-intl";
import { Github } from "lucide-react";

import { site } from "@/config/site";
import { Logo } from "@/components/brand/Logo";
import { SOURCE_LABELS } from "@/lib/sources";

const CATALOG_LINKS = [
  { href: "/apps", key: "browse" },
  { href: "/track", key: "track" },
  { href: "/collections", key: "collections" },
  { href: "/categories", key: "categories" },
  { href: "/developers", key: "developers" },
] as const;

export function Footer() {
  const t = useTranslations("footer");
  const tNav = useTranslations("nav");

  return (
    <footer className="relative mt-24 overflow-hidden border-t border-line/70">
      {/* Hairline brand accent along the very top edge of the footer. */}
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-brand-gradient opacity-70" />
      {/* Faint bottom bloom so the page doesn't end on a flat edge. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 left-1/2 h-64 w-[48rem] max-w-full -translate-x-1/2 rounded-full bg-accent/10 blur-3xl"
      />

      <div className="relative mx-auto max-w-content px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.6fr_1fr_1fr_1.2fr]">
          <div>
            <Link href="/" className="group inline-flex items-center gap-3">
              <Logo size={34} className="rounded-xl shadow-glow transition-transform duration-200 group-hover:scale-105" />
              <span className="font-display text-lg font-bold tracking-tight">{site.name}</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">{t("about")}</p>
            <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-line bg-surface-2/50 px-3.5 py-1.5 text-xs text-muted">
              <span className="relative flex h-2 w-2" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
              {t("poweredBy")}
            </p>
          </div>

          <nav aria-label={tNav("browse")}>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-fg">{t("catalog")}</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {CATALOG_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-muted transition-colors hover:text-fg">
                    {tNav(link.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label={t("project")}>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-fg">{t("project")}</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link href="/dashboard" className="text-muted transition-colors hover:text-fg">
                  {tNav("dashboard")}
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-muted transition-colors hover:text-fg">
                  {t("docs")}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-muted transition-colors hover:text-fg">
                  {t("privacy")}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-muted transition-colors hover:text-fg">
                  {t("terms")}
                </Link>
              </li>
              <li>
                <a
                  href={site.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer external"
                  className="group inline-flex items-center gap-1.5 text-muted transition-colors hover:text-fg"
                >
                  <Github className="h-4 w-4" aria-hidden />
                  {t("source")}
                </a>
              </li>
            </ul>
          </nav>

          {/* Where the catalog actually comes from — the Obtanium promise. */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-fg">{t("sources")}</h2>
            <ul className="mt-4 flex flex-wrap gap-1.5">
              {Object.entries(SOURCE_LABELS).map(([id, label]) => (
                <li key={id}>
                  <span className="chip">{label}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs leading-relaxed text-subtle">{t("sourcesNote")}</p>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-line pt-6 text-xs text-subtle sm:flex-row sm:items-center">
          <p>
            © {new Date().getFullYear()} {site.name} · {t("poweredBy")}
          </p>
          <p className="font-mono">v{site.version}</p>
        </div>
      </div>
    </footer>
  );
}
