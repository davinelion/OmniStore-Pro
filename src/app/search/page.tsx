import { Suspense } from "react";
import type { Metadata } from "next";

import { SearchExperience } from "@/components/search/SearchExperience";
import { AppGridSkeleton } from "@/components/ui/primitives";

/**
 * Search results are user-specific and unbounded, so they are not indexed.
 * Category and app pages remain fully indexable.
 */
export const metadata: Metadata = {
  title: "Search",
  description: "Search open-source applications across iOS, Android, Windows, macOS and Linux.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/search" },
};

export default function SearchPage() {
  return (
    <div className="space-y-6">
      <h1 className="sr-only">Search open-source apps</h1>
      <Suspense fallback={<AppGridSkeleton count={6} />}>
        <SearchExperience />
      </Suspense>
    </div>
  );
}
