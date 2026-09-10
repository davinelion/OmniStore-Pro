import type { Metadata, Viewport } from "next";

import "./globals.css";
import { Providers } from "@/components/layout/Providers";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileNav } from "@/components/layout/MobileNav";
import { Pwa } from "@/components/layout/Pwa";
import { site } from "@/config/site";
import { isLocale, type Locale } from "@/lib/i18n";
import { cookies } from "next/headers";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: site.title,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: site.name, statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/icons/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    siteName: site.name,
    title: site.title,
    description: site.description,
    url: site.url,
  },
  twitter: {
    card: "summary_large_image",
    title: site.title,
    description: site.description,
  },
  robots: { index: true, follow: true },
  category: "technology",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf9" },
    { media: "(prefers-color-scheme: dark)", color: "#090b10" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

async function resolveLocale(): Promise<Locale> {
  const cookie = (await cookies()).get("omnistore_locale")?.value;
  return isLocale(cookie) ? cookie : "en";
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await resolveLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Applied before paint so the stored theme never flashes. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme")||"system";var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);document.documentElement.style.colorScheme=d?"dark":"light";}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen bg-bg font-sans text-fg antialiased">
        <Providers locale={locale}>
          <a href="#main" className="skip-link">
            Skip to content
          </a>
          <Header />
          <Pwa />
          <main id="main" className="mx-auto max-w-content px-4 pb-24 pt-8 md:pb-12">
            {children}
          </main>
          <Footer />
          <MobileNav />
        </Providers>
      </body>
    </html>
  );
}
