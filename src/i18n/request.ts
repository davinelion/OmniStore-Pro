import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./config";

const english = (await import(`../../messages/en.json`)).default;

/**
 * next-intl request configuration (no i18n routing: one set of routes, the
 * active locale travels in a cookie so URLs stay language-independent).
 *
 * Secondary locales merge over the English catalog, so a missing key in a
 * translation renders the English copy — never a raw key or a broken page.
 */
export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieLocale = store.get(LOCALE_COOKIE)?.value;
  const locale: Locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;

  const localized =
    locale === DEFAULT_LOCALE ? english : (await import(`../../messages/${locale}.json`)).default;

  return {
    locale,
    messages: { ...english, ...localized },
    onError() {},
  };
});
