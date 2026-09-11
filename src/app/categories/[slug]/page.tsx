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
  const result = await client.getCategory(decodeURIComponent(slug));
  return {
    title: result?.category.name ?? "Category",
    description: result?.category.description || undefined,
    alternates: { canonical: `/categories/${slug}` },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const client = getOmnisource();
  const t = await getTranslations("categories");

  const decoded = decodeURIComponent(slug);
  const [categoryResult, appsResult] = await Promise.all([
    client.getCategory(decoded),
    client.getApps({ category: decoded, perPage: 60, sort: "popularity" }),
  ]);
  if (!categoryResult && appsResult.items.length === 0) notFound();

  const name = categoryResult?.category.name ?? decoded;
  const description = categoryResult?.category.description || null;

  return (
    <div className="space-y-6">
      <SectionHeading
        title={name}
        description={description || t("appsIn", { category: name })}
      />
      {appsResult.items.length > 0 ? (
        <AppGrid apps={appsResult.items} />
      ) : (
        <p className="py-10 text-center text-sm text-muted">{t("empty")}</p>
      )}
    </div>
  );
}
