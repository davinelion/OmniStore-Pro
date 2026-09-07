import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAppBySlug, getRelated } from "@/lib/api/catalog";
import { AppIcon } from "@/components/app/AppCard";
import { PlatformAvailability, PlatformBadge } from "@/components/platform/PlatformBadge";
import { ScoreBlock } from "@/components/app/Scores";
import { DownloadPanel } from "@/components/app/DownloadPanel";
import { LocalActions } from "@/components/app/LocalActions";
import { sanitizeMarkdown } from "@/lib/security/urls";
import { formatDate, platformLabel } from "@/lib/utils";
import { safeHref } from "@/lib/security/urls";
import { site } from "@/config/site";

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const app = await getAppBySlug(params.slug);
  if (!app) return { title: "App not found" };
  const title = app.name;
  const description = app.short_description ?? site.description;
  const url = `${site.url}/apps/${app.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title: `OmniStore · ${title}`, description, url },
    twitter: { card: "summary", title, description },
  };
}

export default async function AppPage({ params }: Props) {
  const app = await getAppBySlug(params.slug);
  if (!app) notFound();
  const alts = await getRelated(app.alternatives ?? []);
  const similar = await getRelated(app.similar ?? []);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: app.name,
    description: app.short_description,
    applicationCategory: app.categories[0],
    operatingSystem: app.platforms.map(platformLabel).join(", "),
    license: app.license,
    url: `${site.url}/apps/${app.slug}`,
  };

  return (
    <article className="space-y-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="grid gap-6 md:grid-cols-[auto_1fr_auto] md:items-start">
        <AppIcon name={app.name} src={app.icon} />
        <div>
          <h1 className="font-display text-3xl font-semibold">{app.name}</h1>
          <p className="mt-2 text-[var(--muted)]">{app.short_description ?? "Description unavailable"}</p>
          {app.developer && (
            <p className="mt-2 text-sm">
              <Link className="text-accent" href={`/developers/${app.developer.slug}`}>
                {app.developer.name}
              </Link>
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            {app.open_source && <span>✓ Open Source</span>}
            {app.active_development && <span>✓ Active Development</span>}
            {app.license && <span>{app.license}</span>}
          </div>
          <div className="mt-3 flex flex-wrap gap-1">
            {app.platforms.map((p) => (
              <PlatformBadge key={p} platform={p} />
            ))}
          </div>
          <div className="mt-4">
            <LocalActions appId={app.id} name={app.name} description={app.short_description} />
          </div>
        </div>
        <a href="#get" className="h-fit rounded-full bg-accent px-5 py-2 text-center text-white">
          Get App
        </a>
      </header>

      <ScoreBlock app={app} />

      {app.screenshots.length > 0 ? (
        <section>
          <h2 className="font-display text-xl font-semibold">Screenshots</h2>
          <div className="mt-3 flex gap-3 overflow-x-auto">
            {app.screenshots.map((src) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={src} alt="" loading="lazy" className="h-48 rounded-xl" />
            ))}
          </div>
        </section>
      ) : (
        <p className="text-sm text-[var(--muted)]">Screenshots not available</p>
      )}

      <div className="grid gap-8 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="space-y-6">
          <section>
            <h2 className="font-display text-xl font-semibold">About</h2>
            <p className="mt-2 whitespace-pre-wrap text-[var(--muted)]">
              {app.description ?? "Description unavailable"}
            </p>
          </section>
          {app.features?.length ? (
            <section>
              <h2 className="font-display text-xl font-semibold">Features</h2>
              <ul className="mt-2 list-disc pl-5">
                {app.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </section>
          ) : null}
          <section>
            <h2 className="font-display text-xl font-semibold">Supported Platforms</h2>
            <div className="mt-3">
              <PlatformAvailability platforms={app.platforms} />
            </div>
          </section>
          <section>
            <h2 className="font-display text-xl font-semibold">Latest Release</h2>
            <p className="mt-2">
              {app.latest_release?.version ?? "Not available"}
              {app.latest_release?.released_at ? ` · ${formatDate(app.latest_release.released_at)}` : ""}
            </p>
            <div className="prose mt-2 text-sm text-[var(--muted)]">
              {sanitizeMarkdown(app.latest_release?.notes) || "Not available"}
            </div>
          </section>
        </div>
        <aside className="space-y-4">
          <DownloadPanel app={app} />
          <section className="rounded-2xl border border-[var(--line)] p-5 text-sm">
            <h2 className="font-medium">Source</h2>
            <p className="mt-1">{app.source_name ?? "Not available"}</p>
            <p className="text-[var(--muted)]">Status: {app.source_status ?? "Not available"}</p>
            <div className="mt-3 flex flex-col gap-1">
              {safeHref(app.repository) && (
                <a href={safeHref(app.repository)} rel="noreferrer">View Repository</a>
              )}
              {safeHref(app.homepage) && (
                <a href={safeHref(app.homepage)} rel="noreferrer">View Website</a>
              )}
              {safeHref(app.documentation) && (
                <a href={safeHref(app.documentation)} rel="noreferrer">Documentation</a>
              )}
              {safeHref(app.latest_release?.assets?.[0]?.url) && (
                <a href={safeHref(app.latest_release?.assets?.[0]?.url)} rel="noreferrer">View Release</a>
              )}
            </div>
            <p className="mt-3 text-[var(--muted)]">License: {app.license ?? "Not available"}</p>
            <Link className="mt-3 inline-block text-accent" href={`/apps/${app.slug}/releases`}>
              Release history
            </Link>
            <Link className="mt-2 block text-accent" href={`/report?app=${app.slug}`}>
              Report an Issue
            </Link>
          </section>
        </aside>
      </div>

      {alts.length > 0 && (
        <section>
          <h2 className="font-display text-xl font-semibold">Alternatives</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {alts.map((a) => (
              <li key={a.id}>
                <Link className="rounded-full border border-[var(--line)] px-3 py-1" href={`/apps/${a.slug}`}>
                  {a.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {similar.length > 0 && (
        <section>
          <h2 className="font-display text-xl font-semibold">Similar Apps</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {similar.map((a) => (
              <li key={a.id}>
                <Link className="rounded-full border border-[var(--line)] px-3 py-1" href={`/apps/${a.slug}`}>
                  {a.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
