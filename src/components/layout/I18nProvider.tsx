"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { DEFAULT_LOCALE, getMessages, isLocale, LOCALE_LABELS, LOCALES, type Locale, type Messages } from "@/lib/i18n";
import { createTranslator, type Translator } from "@/lib/i18n";

type I18nValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translator;
  messages: Messages;
};

const I18nContext = createContext<I18nValue | null>(null);

const STORAGE_KEY = "omnistore:locale";

function readStoredLocale(): Locale | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)omnistore_locale=([^;]+)/);
  const cookieValue = match ? decodeURIComponent(match[1]) : null;
  if (isLocale(cookieValue)) return cookieValue;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    /* storage unavailable */
  }
  return null;
}

/**
 * Translation context.
 *
 * Components call `t("app.getApp")` instead of hard-coding copy, so adding a
 * language is a data change. Both catalogs ship with the bundle; only the
 * active one is used to render.
 */
export function I18nProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  // Adopt a previously chosen language once, after hydration.
  useEffect(() => {
    const stored = readStoredLocale();
    if (stored && stored !== locale) setLocaleState(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
      document.cookie = `omnistore_locale=${next}; path=/; max-age=31536000; samesite=lax`;
      document.documentElement.lang = next;
    } catch {
      /* storage unavailable — the choice simply is not persisted */
    }
  }, []);

  const value = useMemo<I18nValue>(() => {
    const messages = getMessages(locale);
    return { locale, setLocale, t: createTranslator(messages), messages };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const context = useContext(I18nContext);
  if (!context) {
    // Server components render with the default catalog; no provider needed.
    return {
      locale: DEFAULT_LOCALE,
      setLocale: () => {},
      t: createTranslator(getMessages(DEFAULT_LOCALE)),
      messages: getMessages(DEFAULT_LOCALE),
    };
  }
  return context;
}

export function LocaleSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();
  return (
    <label className={`inline-flex items-center gap-2 text-sm ${className ?? ""}`}>
      <span className="sr-only">Language</span>
      <select
        value={locale}
        onChange={(event) => setLocale(event.target.value as Locale)}
        className="h-9 rounded-full border border-line bg-surface px-3 text-sm"
        aria-label="Language"
      >
        {LOCALES.map((code) => (
          <option key={code} value={code}>
            {LOCALE_LABELS[code]}
          </option>
        ))}
      </select>
      <span className="sr-only">{t("nav.more")}</span>
    </label>
  );
}
