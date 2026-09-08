import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getProvider } from "@/lib/api";
import { AppIcon } from "@/components/app/AppIcon";
import { ReleaseHistory } from "@/components/app/ReleaseHistory";
import { formatDate, relativeTime } from "@/lib/formatters";

export const dynamic = "force-dynamic";

type Params = { params: { slug: string } };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const app = await getProvider().getApp(params.slug);
  if (!app) return { title: "App not found" };
  return {
    title: `${app.name} releases`,
    description: `Release history and changelog for ${app.name}, as published upstream.`,
    alternates: { canonical: `/apps/${app.slug}/releases` },
  };
}

export default async function ReleasesPage({ params }: Params) {
  const provider = getProvider();
  const app = await provider.getApp(params.slug);
  if (!app) notFound();

  const releases = app.releases;

  return (
    <div className="space-y-8">
      <nav aria-label="Breadcrumb">
        <Link
          href={`/apps/${app.slug}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-fg"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back to {app.name}
        </Link>
      </nav>

      <header className="flex flex-wrap items-center gap-4">
        <AppIcon name={app.name} src={app.icon_url} size="lg" />
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{app.name} releases</h1>
          <p className="mt-1 text-sm text-muted">
            {releases.length} release{releases.length === 1 ? "" : "s"} retained from upstream
            {app.signals.release_count && app.signals.release_count > releases.length
              ? ` · ${app.signals.release_count} tagged in total`
              : ""}
            {releases[0]?.released_at ? ` · latest ${relativeTime(releases[0].released_at)}` : ""}
          </p>
        </div>
      </header>

      <ReleaseHistory releases={releases} />

      {app.links.releases ? (
        <p className="text-sm text-muted">
          Looking for an older build?{" "}
          <a
            href={app.links.releases}
            target="_blank"
            rel="noopener noreferrer external"
            className="text-accent hover:underline"
          >
            Browse every release upstream
          </a>
          .
        </p>
      ) : null}

      {releases.length > 0 ? (
        <p className="text-2xs text-fg-subtle">
          Oldest release shown: {formatDate(releases[releases.length - 1]?.released_at)}
        </p>
      ) : null}
    </div>
  );
}
