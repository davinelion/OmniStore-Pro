import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";

import { getProvider } from "@/lib/api";
import { AppCard } from "@/components/app/AppCard";
import { AppIcon } from "@/components/app/AppIcon";
import { SectionHeading } from "@/components/ui/primitives";
import { PlatformBadge } from "@/components/platform/PlatformBadge";
import { formatDate } from "@/lib/formatters";
import { safeHref } from "@/lib/security/urls";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const resolvedParams = await params;
  const result = await getProvider().getDeveloper(resolvedParams.slug);
  if (!result) return { title: "Developer not found" };
  return {
    title: result.developer.name,
    description: `Open-source applications published by ${result.developer.name}.`,
    alternates: { canonical: `/developers/${result.developer.slug}` },
  };
}

export default async function DeveloperPage({ params }: Params) {
  const resolvedParams = await params;
  const result = await getProvider().getDeveloper(resolvedParams.slug);
  if (!result) notFound();

  const { developer, apps, platforms, licenses, latestReleases } = result;

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-start gap-4">
        <AppIcon name={developer.name} src={developer.avatar_url} size="xl" rounded="rounded-full" />
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-semibold tracking-tight">{developer.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted">
            <span>{apps.length} application{apps.length === 1 ? "" : "s"}</span>
            {developer.url ? (
              <a
                href={safeHref(developer.url) ?? "#"}
                target="_blank"
                rel="noopener noreferrer external"
                className="inline-flex items-center gap-1 text-accent hover:underline"
              >
                View upstream profile
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {platforms.map((platform) => (
              <PlatformBadge key={platform} platform={platform} />
            ))}
          </div>
        </div>
      </header>

      <section aria-labelledby="apps-heading" className="space-y-4">
        <SectionHeading id="apps-heading" title="Applications" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {apps.map((app) => (
            <AppCard key={app.id} app={app} />
          ))}
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="licenses-heading" className="space-y-3">
          <h2 id="licenses-heading" className="text-lg font-semibold">
            Licenses
          </h2>
          {licenses.length === 0 ? (
            <p className="text-sm text-muted">Not available</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {licenses.map((license) => (
                <li key={license.id}>
                  <Link
                    href={`/search?license=${encodeURIComponent(license.id)}`}
                    className="rounded-full border border-line px-3 py-1 text-sm transition-colors hover:border-accent/50 hover:text-accent"
                  >
                    {license.id}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="releases-heading" className="space-y-3">
          <h2 id="releases-heading" className="text-lg font-semibold">
            Latest Releases
          </h2>
          {latestReleases.length === 0 ? (
            <p className="text-sm text-muted">Not available</p>
          ) : (
            <ol className="space-y-2">
              {latestReleases.map((entry) => (
                <li key={`${entry.app.id}-${entry.release.id}`} className="rounded-xl border border-line p-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <Link href={`/apps/${entry.app.slug}`} className="font-medium hover:text-accent">
                      {entry.app.name}
                    </Link>
                    <span className="text-2xs text-fg-subtle">
                      {entry.release.released_at ? formatDate(entry.release.released_at) : "Date not available"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted">v{entry.release.version}</p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
