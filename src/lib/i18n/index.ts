import { en, type Messages } from "./en";
import { bn } from "./bn";

export const LOCALES = ["en", "bn"] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  bn: "বাংলা",
};

export const DEFAULT_LOCALE: Locale = "en";

const catalogs: Record<Locale, Messages> = { en, bn };

export function isLocale(value: string | null | undefined): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

export function getMessages(locale: Locale = DEFAULT_LOCALE): Messages {
  return catalogs[locale] ?? en;
}

export { en, bn };
export type { Messages };

/* ------------------------------------------------------------------ */
/* Dot-path lookup                                                     */
/* ------------------------------------------------------------------ */

type PathValue<T, P extends string> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? PathValue<T[K], Rest>
    : never
  : P extends keyof T
    ? T[P]
    : never;

export type MessageKey = {
  [K in keyof Messages]: Messages[K] extends object
    ? `${K & string}.${keyof Messages[K] & string}`
    : never;
}[keyof Messages];

type Interpolations = Record<string, string | number>;

/**
 * Type-safe translation lookup.
 *
 * Falls back to English for any missing Bengali string, then to the key itself
 * so a missing translation can never blank out the UI.
 */
export function translate(messages: Messages, key: string, values?: Interpolations): string {
  const resolve = (source: unknown, path: string[]): string | undefined => {
    let current: unknown = source;
    for (const segment of path) {
      if (current == null || typeof current !== "object") return undefined;
      current = (current as Record<string, unknown>)[segment];
    }
    return typeof current === "string" ? current : undefined;
  };

  const path = key.split(".");
  const value = resolve(messages, path) ?? resolve(en, path);
  if (value === undefined) return key;
  if (!values) return value;

  return value.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : match,
  );
}

export function createTranslator(messages: Messages) {
  return (key: string, values?: Interpolations) => translate(messages, key, values);
}

export type Translator = ReturnType<typeof createTranslator>;

/** Typed helper for call sites that want compile-time key checking. */
export function tOf<P extends MessageKey>(messages: Messages) {
  return (key: P, values?: Interpolations): string => translate(messages, key, values);
}
