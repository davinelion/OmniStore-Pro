import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getProvider } from "@/lib/api";
import { AppCard } from "@/components/app/AppCard";
import { Badge, EmptyState } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const resolvedParams = await params;
  const result = await getProvider().getCollection(resolvedParams.slug);
  if (!result) return { title: "Collection not found" };
  return {
    title: result.collection.name,
    description: result.collection.description ?? `${result.collection.name} — OmniStore collection.`,
    alternates: { canonical: `/collections/${result.collection.slug}` },
  };
}

export default async function CollectionPage({ params }: Params) {
  const resolvedParams = await params;
  const result = await getProvider().getCollection(resolvedParams.slug);
  if (!result) notFound();

  const { collection, apps } = result;

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">{collection.name}</h1>
          <Badge tone={collection.rule ? "accent" : "neutral"}>
            {collection.rule ? "Generated from catalog data" : "Curated"}
          </Badge>
        </div>
        {collection.description ? <p className="text-muted">{collection.description}</p> : null}
        {collection.rule ? (
          <p className="text-2xs text-fg-subtle">
            Rule:{" "}
            {[
              collection.rule.categories.length ? `categories ${collection.rule.categories.join(", ")}` : null,
              collection.rule.platforms.length ? `platforms ${collection.rule.platforms.join(", ")}` : null,
              collection.rule.min_platforms ? `at least ${collection.rule.min_platforms} platforms` : null,
              `sorted by ${collection.rule.sort}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        ) : null}
      </header>

      {apps.length === 0 ? (
        <EmptyState title="This collection has no apps yet." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {apps.map((app) => (
            <AppCard key={app.id} app={app} />
          ))}
        </div>
      )}
    </div>
  );
}
