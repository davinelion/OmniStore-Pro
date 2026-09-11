import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Layers } from "lucide-react";

import { getOmnisource } from "@/lib/omnisource";
import { CollectionBrowser } from "@/components/collection/CollectionBrowser";
import { formatDateTime } from "@/lib/formatters";

export const revalidate = 600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const client = getOmnisource();
  const collection = await client.getCollection(decodeURIComponent(slug));
  if (!collection) return { title: "Collection" };
  return {
    title: collection.name,
    description: collection.description || undefined,
    alternates: { canonical: `/collection/${collection.slug}` },
  };
}

/** Collection detail (Phase 7): banner, filtering, search-inside, infinite scroll. */
export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const client = getOmnisource();
  const t = await getTranslations("collections");

  const collection = await client.getCollection(decodeURIComponent(slug));
  if (!collection) notFound();

  const apps = collection.apps ?? [];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <header className="relative overflow-hidden rounded-4xl border border-line bg-gradient-to-br from-accent-soft via-surface to-surface p-6 sm:p-10">
        {apps[0]?.banner ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={apps[0].banner}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-15"
            />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-surface via-surface/85 to-surface/40" />
          </>
        ) : null}
        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-surface/70 px-3 py-1 text-xs font-medium text-accent">
            <Layers className="h-3.5 w-3.5" aria-hidden />
            {t("title")}
          </span>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            {collection.name}
          </h1>
          {collection.description ? (
            <p className="mt-2 text-sm text-muted sm:text-base">{collection.description}</p>
          ) : null}
          <p className="mt-3 text-xs text-subtle">
            {t("apps", { count: collection.itemCount })}
            {collection.updatedAt ? ` · ${formatDateTime(collection.updatedAt)}` : ""}
          </p>
        </div>
      </header>

      {apps.length > 0 ? (
        <CollectionBrowser apps={apps} />
      ) : (
        <p className="py-10 text-center text-sm text-muted">{t("empty")}</p>
      )}
    </div>
  );
}
