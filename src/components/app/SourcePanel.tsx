import { ExternalLink, GitBranch } from "lucide-react";

import type { App } from "@omnistore/shared-models";
import { relativeTime } from "@/lib/formatters";
import { safeHref } from "@/lib/security/urls";
import { sourceFromRepository } from "@/lib/sources";
import { SourceBadge } from "./SourceBadge";
import { TrackButton } from "@/components/track/TrackButton";

/**
 * SourcePanel — provenance, up front.
 *
 * Obtanium's core promise is that you always know exactly where a build came
 * from. This panel states the upstream host, the repository, and the release
 * OmniSource last validated — before any download button.
 */
export function SourcePanel({ app }: { app: App }) {
  const source = sourceFromRepository(app.repository);
  const repository = app.repository ? safeHref(app.repository) : null;
  const releasedAt = app.latestRelease?.releasedAt ?? null;

  return (
    <section className="card-glass space-y-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <GitBranch className="h-3.5 w-3.5 text-accent" aria-hidden />
          Source
        </h2>
        <SourceBadge source={source} />
      </div>

      <dl className="space-y-2 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-xs text-muted">Latest release</dt>
          <dd className="font-mono text-xs font-semibold">
            {app.version ?? <span className="text-subtle">No release yet</span>}
          </dd>
        </div>
        {releasedAt ? (
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-xs text-muted">Published</dt>
            <dd className="text-xs">{relativeTime(releasedAt)}</dd>
          </div>
        ) : null}
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-xs text-muted">License</dt>
          <dd className="truncate font-mono text-xs">{app.license ?? "—"}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <TrackButton
          appId={app.id}
          slug={app.slug}
          name={app.name}
          sourceUrl={app.repository ?? app.homepage ?? ""}
          source={source}
          icon={app.icon}
          developer={app.developer}
          platforms={app.platforms ?? []}
          version={app.version ?? null}
          releasedAt={releasedAt}
        />
        {repository ? (
          <a
            href={repository}
            target="_blank"
            rel="noopener noreferrer external"
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-surface-2/60 px-3.5 text-sm transition-colors hover:border-accent/50"
          >
            <GitBranch className="h-3.5 w-3.5" aria-hidden />
            Repository
            <ExternalLink className="h-3 w-3 text-subtle" aria-hidden />
          </a>
        ) : null}
      </div>
    </section>
  );
}
