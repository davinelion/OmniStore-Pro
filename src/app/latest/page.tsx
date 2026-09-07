import type { Metadata } from "next";
import Link from "next/link";

import { getProvider } from "@/lib/api";
import { AppCard } from "@/components/app/AppCard";
import { AppIcon } from "@/components/app/AppIcon";
import { SectionHeading } from "@/components/ui/primitives";
import { formatDate, relativeTime } from "@/lib/formatters";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Latest",
  description: "Recently added, updated and released open-source applications.",
  alternates: { canonical: "/latest" },
};

export default async function LatestPage() {
  const latest = await getProvider().getLatest();

  return (
    <div className="space-y-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Latest</h1>
        <p className="text-muted">Freshly added, updated and released applications.</p>
        {latest.freshness ? (
          <p className="text-2xs text-fg-subtle">Catalog snapshot {relativeTime(latest.freshness)}</p>
        ) : null}
      </header>

      <section aria-labelledby="releases-heading" className="space-y-4">
        <SectionHeading id="releases-heading" title="Latest Releases" />
        <ul className="space-y-2">
          {latest.releases.map((entry) => (
            <li
              key={`${entry.app.id}-${entry.release.id}`}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-line p-3"
            >
              <AppIcon name={entry.app.name} src={entry.app.icon_url} size="sm" />
              <div className="min-w-0 flex-1">
                <Link href={`/apps/${entry.app.slug}`} className="font-medium hover:text-accent">
                  {entry.app.name}
                </Link>
                <p className="truncate text-2xs text-fg-subtle">
                  v{entry.release.version}
                  {entry.release.released_at ? ` · ${formatDate(entry.release.released_at)}` : ""}
                  {entry.release.assets.length
                    ? ` · ${entry.release.assets.length} package${entry.release.assets.length === 1 ? "" : "s"}`
                    : ""}
                </p>
              </div>
              {entry.release.url ? (
                <Link
                  href={`/apps/${entry.app.slug}/releases`}
                  className="text-sm text-accent hover:underline"
                >
                  Release notes
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="added-heading" className="space-y-4">
        <SectionHeading id="added-heading" title="Recently Added" description="New to the OmniSource catalog." />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {latest.added.slice(0, 6).map((app) => (
            <AppCard key={app.id} app={app} />
          ))}
        </div>
      </section>

      <section aria-labelledby="updated-heading" className="space-y-4">
        <SectionHeading id="updated-heading" title="Recently Updated" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {latest.updated.slice(0, 6).map((app) => (
            <AppCard key={app.id} app={app} />
          ))}
        </div>
      </section>
    </div>
  );
}
