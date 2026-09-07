import type { Metadata } from "next";
import Link from "next/link";

import { getProvider } from "@/lib/api";
import { AppIcon } from "@/components/app/AppIcon";
import { SectionHeading } from "@/components/ui/primitives";
import { pluralize } from "@/lib/formatters";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Developers",
  description: "Upstream developers and organisations publishing open-source applications in OmniStore.",
  alternates: { canonical: "/developers" },
};

export default async function DevelopersPage() {
  const developers = await getProvider().getDevelopers();

  return (
    <div className="space-y-8">
      <SectionHeading
        title="Developers"
        description={`${developers.length} upstream developers and organisations represented in the catalog.`}
      />

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {developers.map((developer) => (
          <li key={developer.id}>
            <Link href={`/developers/${developer.slug}`} className="card card-interactive flex items-center gap-3 p-4">
              <AppIcon name={developer.name} src={developer.avatar_url} size="md" rounded="rounded-full" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{developer.name}</p>
                <p className="text-sm text-muted">{pluralize(developer.app_count, "app")}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <p className="text-2xs text-fg-subtle">
        OmniStore is a discovery interface. Every application remains the work of its upstream authors.
      </p>
    </div>
  );
}
