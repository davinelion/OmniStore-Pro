import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import { UserCollections } from "@/components/library/UserCollections";
import { SectionHeading, Skeleton } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "My collections",
  robots: { index: false },
};

export default async function MyCollectionsPage() {
  const t = await getTranslations("collections");
  return (
    <div className="space-y-6">
      <SectionHeading level={1} title={t("userTitle")} description={t("description")} />
      <Suspense fallback={<Skeleton className="h-40 w-full" />}>
        <UserCollections />
      </Suspense>
    </div>
  );
}
