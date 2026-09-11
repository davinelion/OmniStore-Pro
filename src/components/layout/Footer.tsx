import Link from "next/link";
import { useTranslations } from "next-intl";

import { site } from "@/config/site";

export function Footer() {
  const t = useTranslations("footer");

  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-content gap-8 px-4 py-10 sm:px-6 md:grid-cols-[2fr_1fr_1fr]">
        <div>
          <p className="flex items-center gap-2 font-semibold">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-xs font-bold text-accent-fg">
              O
            </span>
            OmniStore
          </p>
          <p className="mt-3 max-w-md text-sm text-muted">{t("about")}</p>
        </div>
        <nav aria-label="Footer">
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/about" className="text-muted hover:text-fg hover:underline">
                {t("docs")}
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="text-muted hover:text-fg hover:underline">
                {t("privacy")}
              </Link>
            </li>
            <li>
              <Link href="/terms" className="text-muted hover:text-fg hover:underline">
                {t("terms")}
              </Link>
            </li>
          </ul>
        </nav>
        <div className="space-y-2 text-sm">
          <a
            href={site.repoUrl}
            target="_blank"
            rel="noopener noreferrer external"
            className="block text-muted hover:text-fg hover:underline"
          >
            {t("source")}
          </a>
          <p className="text-xs text-subtle">{t("poweredBy")}</p>
        </div>
      </div>
    </footer>
  );
}
