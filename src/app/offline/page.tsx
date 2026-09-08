import Link from "next/link";
import { WifiOff } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";

export const metadata = {
  title: "Offline",
  robots: { index: false, follow: false },
};

/**
 * Offline shell.
 *
 * Honest about what is cached: pages and metadata you have already visited are
 * available; the full catalog is not, and we do not pretend otherwise.
 */
export default function OfflinePage() {
  return (
    <div className="mx-auto max-w-lg space-y-6 py-16 text-center">
      <WifiOff className="mx-auto h-10 w-10 text-fg-subtle" aria-hidden />
      <h1 className="text-2xl font-semibold">You are offline</h1>
      <p className="text-muted">
        OmniStore caches the pages, apps and search results you have already opened, so you can keep
        browsing those. The full catalog needs a connection.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <ButtonLink href="/">Try again</ButtonLink>
        <ButtonLink href="/favorites" variant="outline">
          Your favorites
        </ButtonLink>
      </div>
      <p className="text-2xs text-fg-subtle">
        Install OmniStore as an app to keep more of it available offline.{" "}
        <Link href="/docs" className="text-accent hover:underline">
          Learn how it works
        </Link>
      </p>
    </div>
  );
}
