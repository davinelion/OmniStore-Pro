import type { Metadata } from "next";
import Link from "next/link";

import { getProvider } from "@/lib/api";
import { AppIcon } from "@/components/app/AppIcon";
import { SectionHeading } from "@/components/ui/primitives";
import { Badge } from "@/components/ui/primitives";
import { pluralize } from "@/lib/formatters";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Collections",
  description: "Curated and generated sets of open-source applications from the OmniSource catalog.",
  alternates: { canonical: "/collections" },
};

export default async function CollectionsPage() {
  const provider = getProvider();
  const collections = await provider.getCollections();

  const withApps = await Promise.all(
    collections.map(async (collection) => ({
      collection,
      apps: (await provider.getCollection(collection.slug))?.apps ?? [],
    })),
  );

  return (
    <div className="space-y-8">
      <SectionHeading
        title="Collections"
        description="Rule-generated sets from live catalog data — no hand-maintained app lists."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {withApps.map(({ collection, apps }) => (
          <Link
            key={collection.slug}
            href={`/collections/${collection.slug}`}
            className="card card-interactive p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-semibold">{collection.name}</h2>
              <Badge tone={collection.rule ? "accent" : "neutral"}>
                {collection.rule ? "Generated" : "Curated"}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-muted">{collection.description}</p>
            <div className="mt-4 flex items-center gap-1">
              {apps.slice(0, 6).map((app) => (
                <AppIcon
                  key={app.id}
                  name={app.name}
                  src={app.icon_url}
                  size="sm"
                  className="h-8 w-8 rounded-lg text-2xs"
                />
              ))}
              <span className="ml-2 text-sm text-fg-subtle">{pluralize(apps.length, "app")}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
