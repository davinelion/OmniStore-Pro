/**
 * i18n configuration. OmniStore ships eight locales; every UI string lives in
 * messages/<locale>.json — components never hard-code copy.
 */

export const LOCALES = ["en", "bn", "ar", "es", "fr", "de", "zh", "ja"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  bn: "বাংলা",
  ar: "العربية",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  zh: "中文",
  ja: "日本語",
};

/** Locales rendered right-to-left. */
export const RTL_LOCALES: readonly Locale[] = ["ar"];

export function isLocale(value: string | null | undefined): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

export function isRtl(locale: Locale): boolean {
  return RTL_LOCALES.includes(locale);
}

export function dirFor(locale: Locale): "ltr" | "rtl" {
  return isRtl(locale) ? "rtl" : "ltr";
}

export const LOCALE_COOKIE = "NEXT_LOCALE";
