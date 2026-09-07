import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/layout/Providers";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileNav } from "@/components/layout/MobileNav";
import { Pwa } from "@/components/layout/Pwa";
import { site } from "@/config/site";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.name, template: `%s · ${site.name}` },
  description: site.description,
  manifest: "/manifest.webmanifest",
  openGraph: { title: site.name, description: site.description, siteName: site.name },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans pb-16 md:pb-0">
        <Providers>
          <Header />
          <main className="mx-auto min-h-[70vh] max-w-7xl px-4 py-8">{children}</main>
          <Footer />
          <MobileNav />
          <Pwa />
        </Providers>
      </body>
    </html>
  );
}
