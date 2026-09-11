import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { LibraryTabs } from "@/components/library/LibraryTabs";
import { SectionHeading } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "My library",
  description: "Favorites, bookmarks and watchlists — local-first, cloud-synced.",
  robots: { index: false },
};

export default async function FavoritesPage() {
  const t = await getTranslations("library");
  return (
    <div className="space-y-6">
      <SectionHeading level={1} title={t("title")} description={t("description")} />
      <LibraryTabs />
    </div>
  );
}
