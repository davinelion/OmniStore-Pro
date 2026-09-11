import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { getOmnisource } from "@/lib/omnisource";
import { AppGrid } from "@/components/app/AppCard";
import { SectionHeading } from "@/components/ui/primitives";

export const revalidate = 600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const client = getOmnisource();
  const developer = await client.getDeveloper(decodeURIComponent(slug));
  return {
    title: developer?.name ?? "Developer",
    alternates: { canonical: `/developers/${slug}` },
  };
}

export default async function DeveloperPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const client = getOmnisource();
  const t = await getTranslations("developers");

  const developer = await client.getDeveloper(decodeURIComponent(slug));
  if (!developer) notFound();

  return (
    <div className="space-y-6">
      <SectionHeading
        title={t("appsBy", { developer: developer.name })}
        description={t("appCount", { count: developer.appCount })}
      />
      {developer.apps.length > 0 ? (
        <AppGrid apps={developer.apps} />
      ) : (
        <p className="py-10 text-center text-sm text-muted">{t("empty")}</p>
      )}
    </div>
  );
}
