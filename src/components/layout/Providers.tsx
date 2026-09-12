"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState } from "react";

/**
 * Global client providers: TanStack Query (server-state) + next-themes
 * (no-flash theming). Locale comes from next-intl at the layout level.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            gcTime: 10 * 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {/*
        Dark-first: the storefront is designed as a dark, glass/aurora surface.
        `enableSystem` is off so the intended identity is what visitors see on a
        first load; the header toggle still offers light and dark, and the choice
        is remembered per device. Set `enableSystem` back to true to follow the
        OS preference instead.
      */}
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
