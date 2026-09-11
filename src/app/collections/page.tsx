import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { UserRound } from "lucide-react";

import { getOmnisource } from "@/lib/omnisource";
import { CollectionCard } from "@/components/collection/CollectionCard";
import { SectionHeading } from "@/components/ui/primitives";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Collections",
  description: "Curated app collections assembled in OmniSource.",
};

export default async function CollectionsPage() {
  const [t, tCommon] = await Promise.all([getTranslations("collections"), getTranslations("common")]);
  const client = getOmnisource();
  const { items } = await client.getCollections(1, 60);

  return (
    <div className="space-y-8">
      <SectionHeading title={t("title")} description={t("description")} />

      {items.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">{t("empty")}</p>
      )}

      <section className="border-t border-line pt-6">
        <a
          href="/collections/mine"
          className="card card-interactive flex items-center gap-3 p-4 text-sm font-medium hover:shadow-card"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <UserRound className="h-4.5 w-4.5" aria-hidden />
          </span>
          <span>
            {t("userTitle")}
            <span className="block text-xs font-normal text-muted">{tCommon("seeMore")}</span>
          </span>
        </a>
      </section>
    </div>
  );
}
