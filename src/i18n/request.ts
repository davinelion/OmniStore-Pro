import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./config";

const english = (await import(`../../messages/en.json`)).default;

/**
 * next-intl request configuration (no i18n routing: one set of routes, the
 * active locale travels in a cookie so URLs stay language-independent).
 *
 * Locale files are validated for exact leaf-key parity in CI, so every runtime
 * locale is loaded as a complete catalog. There is no missing-key fallback.
 */
export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieLocale = store.get(LOCALE_COOKIE)?.value;
  const locale: Locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;

  const localized =
    locale === DEFAULT_LOCALE ? english : (await import(`../../messages/${locale}.json`)).default;

  return {
    locale,
    messages: localized,
    onError(error) {
      // A complete catalog is a release invariant. Keep production UI quiet,
      // while allowing the validation script to catch missing keys before deploy.
      if (process.env.NODE_ENV !== "production") console.error(error);
    },
  };
});
