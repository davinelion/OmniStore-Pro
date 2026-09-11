"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Globe } from "lucide-react";

import { LOCALE_COOKIE, LOCALES, LOCALE_LABELS, dirFor, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

/**
 * Language switcher — writes the locale cookie and refreshes the route so
 * server components re-render in the chosen language.
 */
export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("nav");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dir, setDir] = useState<"ltr" | "rtl">("ltr");

  useEffect(() => setDir(dirFor(locale)), [locale]);

  function choose(next: Locale) {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("language")}
        className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-muted transition-colors hover:border-accent/50 hover:text-fg"
      >
        <Globe className="h-4 w-4" aria-hidden />
        {compact ? null : <span>{LOCALE_LABELS[locale]}</span>}
      </button>
      {open ? (
        <ul
          role="listbox"
          aria-label={t("language")}
          className="absolute end-0 top-full z-50 mt-2 max-h-80 w-44 overflow-auto rounded-2xl border border-line bg-surface p-1.5 shadow-raised"
        >
          {LOCALES.map((value) => (
            <li key={value}>
              <button
                type="button"
                role="option"
                aria-selected={value === locale}
                onClick={() => choose(value)}
                dir={dirFor(value)}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl px-3 py-2 text-start text-sm hover:bg-surface-2",
                  value === locale ? "font-semibold text-accent" : "text-fg",
                )}
              >
                {LOCALE_LABELS[value]}
                {value === locale ? <span aria-hidden>✓</span> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <span className="sr-only" dir={dir}>
        {LOCALE_LABELS[locale]}
      </span>
    </div>
  );
}
