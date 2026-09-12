import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { getOmnisource } from "@/lib/omnisource";
import { orEmpty } from "@/lib/omnisource/with-fallback";
import { DeveloperCard } from "@/components/developer/DeveloperCard";
import { SectionHeading } from "@/components/ui/primitives";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Developers",
  description: "The people and teams building the catalog.",
  alternates: { canonical: "/developers" },
};

export default async function DevelopersPage() {
  const t = await getTranslations("developers");
  const client = getOmnisource();
  const developers = await orEmpty(client.getDevelopers(120), "developers page");

  return (
    <div className="space-y-6">
      <SectionHeading level={1} title={t("title")} description={t("description")} />
      {developers.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {developers.map((developer) => (
            <DeveloperCard key={developer.id} developer={developer} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">{t("empty")}</p>
      )}
    </div>
  );
}
