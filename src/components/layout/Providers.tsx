"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState } from "react";

import { I18nProvider } from "./I18nProvider";
import type { Locale } from "@/lib/i18n";
import type { SiteConfig } from "@/lib/api/client";

/**
 * Root client providers.
 *
 * Query defaults are tuned for catalog data: metadata can be served stale for a
 * minute while a revalidation happens in the background, and failed requests
 * retry twice before the UI shows an error state.
 */
export function Providers({
  children,
  locale,
  config,
}: {
  children: React.ReactNode;
  locale?: Locale;
  config?: SiteConfig | null;
}) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            gcTime: 15 * 60_000,
            retry: 2,
            refetchOnWindowFocus: false,
            // Offline users keep the last successful payload instead of an error.
            networkMode: "offlineFirst",
          },
        },
      }),
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={client}>
        <I18nProvider initialLocale={locale}>{children}</I18nProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
