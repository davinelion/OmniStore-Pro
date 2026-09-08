import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCode2,
  GitBranch,
  Globe,
  Package,
  Star,
  Tag,
} from "lucide-react";

import type { App } from "@/lib/schemas/omnisource";
import { formatCompactNumber, formatDate, NOT_AVAILABLE, relativeTime } from "@/lib/formatters";
import { safeHref } from "@/lib/security/urls";
import { Badge, FactList } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

/**
 * Upstream provenance.
 *
 * OmniStore strengthens the open-source ecosystem: every app page points back
 * to the repository, licence, homepage and releases it came from.
 */
export function SourcePanel({ app }: { app: App }) {
  const links = [
    { label: "View Repository", href: safeHref(app.links.repository), icon: GitBranch },
    { label: "View Website", href: safeHref(app.links.homepage), icon: Globe },
    { label: "Documentation", href: safeHref(app.links.documentation), icon: FileCode2 },
    { label: "View Release", href: safeHref(app.latest_release?.url ?? app.links.releases), icon: Package },
  ].filter((link): link is { label: string; href: string; icon: typeof GitBranch } => Boolean(link.href));

  return (
    <section className="card p-5" aria-labelledby="source-heading">
      <h2 id="source-heading" className="flex items-center gap-2 text-sm font-semibold">
        <GitBranch className="h-4 w-4 text-fg-subtle" aria-hidden />
        Source
      </h2>

      <dl className="mt-3 space-y-1.5 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-fg-muted">Provider</dt>
          <dd className="font-medium">{app.source.name}</dd>
        </div>
        {app.source.repo ? (
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-fg-muted">Repository</dt>
            <dd className="truncate font-medium">{app.source.repo}</dd>
          </div>
        ) : null}
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-fg-muted">Status</dt>
          <dd>
            {app.source.status === "HEALTHY" ? (
              <Badge tone="success">
                <CheckCircle2 className="h-3 w-3" aria-hidden />
                Healthy
              </Badge>
            ) : app.source.status === "DEGRADED" ? (
              <Badge tone="warning">
                <AlertTriangle className="h-3 w-3" aria-hidden />
                Archived upstream
              </Badge>
            ) : (
              <Badge tone="neutral">{NOT_AVAILABLE}</Badge>
            )}
          </dd>
        </div>
      </dl>

      {links.length > 0 ? (
        <ul className="mt-4 space-y-1.5">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <li key={link.label}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer external"
                  className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-sm transition-colors hover:border-accent/50 hover:text-accent"
                >
                  <span className="inline-flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-fg-subtle" aria-hidden />
                    {link.label}
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 text-fg-subtle" aria-hidden />
                </a>
              </li>
            );
          })}
        </ul>
      ) : null}

      <div className="mt-4 border-t border-line pt-3 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-fg-muted">License</dt>
          <dd className="text-right font-medium">
            {app.license ? (
              app.license.url ? (
                <a
                  href={safeHref(app.license.url) ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer external"
                  className="hover:text-accent hover:underline"
                >
                  {app.license.id}
                </a>
              ) : (
                app.license.id
              )
            ) : (
              NOT_AVAILABLE
            )}
          </dd>
        </div>
      </div>
    </section>
  );
}

/** Observable upstream signals — the raw material behind every score. */
export function StatisticsPanel({ app }: { app: App }) {
  const items = [
    { label: "Stars", value: app.signals.stars == null ? null : formatCompactNumber(app.signals.stars) },
    { label: "Forks", value: app.signals.forks == null ? null : formatCompactNumber(app.signals.forks) },
    { label: "Open issues", value: app.signals.open_issues == null ? null : formatCompactNumber(app.signals.open_issues) },
    { label: "Watchers", value: app.signals.watchers == null ? null : formatCompactNumber(app.signals.watchers) },
    { label: "Tagged releases", value: app.signals.release_count == null ? null : String(app.signals.release_count) },
    {
      label: "Release cadence",
      value:
        app.signals.release_cadence_days == null
          ? null
          : app.signals.release_cadence_days < 1
            ? "Daily"
            : `${Math.round(app.signals.release_cadence_days)} days`,
    },
    { label: "First release", value: app.signals.first_release_at ? formatDate(app.signals.first_release_at) : null },
    { label: "Latest release", value: app.signals.last_release_at ? formatDate(app.signals.last_release_at) : null },
    { label: "Repository created", value: app.signals.repo_created_at ? formatDate(app.signals.repo_created_at) : null },
    { label: "Last push", value: app.signals.repo_pushed_at ? relativeTime(app.signals.repo_pushed_at) : null },
  ].filter((item): item is { label: string; value: string } => item.value != null);

  return (
    <section className="card p-5" aria-labelledby="statistics-heading">
      <h2 id="statistics-heading" className="flex items-center gap-2 text-sm font-semibold">
        <Star className="h-4 w-4 text-fg-subtle" aria-hidden />
        Statistics
      </h2>
      <FactList className="mt-2" items={items.map((item) => ({ label: item.label, value: item.value }))} />
      <p className="mt-3 text-2xs text-fg-subtle">
        Values are reported by the upstream source, not by OmniStore.
      </p>
    </section>
  );
}

/** Per-platform installation guidance, from configuration rather than guesswork. */
export function InstallationPanel({
  app,
  platforms,
}: {
  app: App;
  platforms: Array<{ slug: string; name: string; installMethods: string[]; handoff: string }>;
}) {
  const relevant = platforms.filter((platform) => app.platforms.includes(platform.slug as never));

  if (relevant.length === 0) {
    return (
      <section className="card p-5">
        <h2 className="text-sm font-semibold">Installation</h2>
        <p className="mt-2 text-sm text-muted">
          Installation information is not available for this application.
        </p>
      </section>
    );
  }

  return (
    <section className="card p-5" aria-labelledby="install-heading">
      <h2 id="install-heading" className="flex items-center gap-2 text-sm font-semibold">
        <Package className="h-4 w-4 text-fg-subtle" aria-hidden />
        Installation
      </h2>
      <ul className="mt-3 space-y-3">
        {relevant.map((platform) => (
          <li key={platform.slug} className="rounded-xl border border-line bg-surface-2/40 p-3">
            <p className="text-sm font-medium">{platform.name}</p>
            <p className="mt-1 text-2xs text-fg-muted">
              Method: <span className="font-medium text-fg">{platform.installMethods.join(" / ")}</span>
            </p>
            <p className="mt-1.5 text-2xs text-fg-subtle">{platform.handoff}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Metadata footer: developer, categories, tags, dates. */
export function AppMetaRow({ app }: { app: App }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
      {app.developer ? (
        <span className="inline-flex items-center gap-1.5">
          <span className="text-fg-subtle">By</span>
          <Link
            href={`/developers/${app.developer.slug}`}
            className={cn("font-medium text-fg hover:text-accent hover:underline")}
          >
            {app.developer.name}
          </Link>
        </span>
      ) : null}

      {app.categories.map((category) => (
        <Link key={category} href={`/categories/${category}`} className="hover:text-accent hover:underline">
          #{category}
        </Link>
      ))}

      {app.latest_release?.released_at ? (
        <span className="inline-flex items-center gap-1.5 text-fg-subtle">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden />
          {relativeTime(app.latest_release.released_at)}
        </span>
      ) : null}

      {app.updated_at ? (
        <span className="inline-flex items-center gap-1.5 text-fg-subtle">
          <Clock className="h-3.5 w-3.5" aria-hidden />
          Updated {relativeTime(app.updated_at)}
        </span>
      ) : null}

      {app.tags.length > 0 ? (
        <span className="inline-flex items-center gap-1 text-fg-subtle">
          <Tag className="h-3.5 w-3.5" aria-hidden />
          {app.tags.slice(0, 4).join(", ")}
        </span>
      ) : null}
    </div>
  );
}
