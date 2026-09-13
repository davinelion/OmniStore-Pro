import { ExternalLink, GitBranch, Github, Globe, BookOpen, ShieldCheck, Package, Star, GitFork, Eye } from "lucide-react";

import type { App } from "@omnistore/shared-models";
import { relativeTime, formatCompactNumber } from "@/lib/formatters";
import { safeHref } from "@/lib/security/urls";
import { sourceFromRepository } from "@/lib/sources";
import { SourceBadge } from "./SourceBadge";
import { TrackButton } from "@/components/track/TrackButton";

/**
 * SourcePanel — provenance, up front, App Store style with direct source links
 * Shows repository, homepage, docs, stars, forks, license, trust - like F-Droid transparency
 */
export function SourcePanel({ app }: { app: App }) {
  const source = sourceFromRepository(app.repository);
  const repository = app.repository ? safeHref(app.repository) : null;
  const homepage = app.homepage ? safeHref(app.homepage) : null;
  const docs = app.documentation ? safeHref(app.documentation) : null;
  const releasedAt = app.latestRelease?.releasedAt ?? null;

  // Try to get signals if available (from feed)
  const signals = (app as any)._signals as { stars: number; forks: number; watchers: number; language: string; full_name: string } | undefined;

  return (
    <section className="card overflow-hidden">
      <div className="bg-gradient-to-br from-surface-2 to-surface-3/50 p-4 border-b border-line">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent text-white">
              <Github className="h-4 w-4" />
            </div>
            Source & Transparency
            <span className="rounded-full bg-success/10 px-2 py-0.5 text-2xs font-semibold text-success">Open Source</span>
          </h2>
          <SourceBadge source={source} />
        </div>
        <p className="mt-2 text-2xs text-muted">Like F-Droid: source always visible, audit before install. Direct downloads from upstream.</p>
      </div>

      <div className="space-y-4 p-4">
        {/* Key metrics - like App Store */}
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border border-line bg-surface-2/30 p-3">
            <dt className="flex items-center gap-1 text-2xs font-semibold uppercase tracking-wide text-subtle">
              <Package className="h-3 w-3" />
              Latest Release
            </dt>
            <dd className="mt-1 font-mono text-sm font-bold">
              {app.version ? `v${app.version}` : <span className="text-subtle text-xs">No release yet</span>}
            </dd>
            {releasedAt ? <dd className="text-2xs text-muted">{relativeTime(releasedAt)}</dd> : null}
          </div>
          <div className="rounded-xl border border-line bg-surface-2/30 p-3">
            <dt className="flex items-center gap-1 text-2xs font-semibold uppercase tracking-wide text-subtle">
              <ShieldCheck className="h-3 w-3" />
              License
            </dt>
            <dd className="mt-1 truncate font-mono text-sm font-bold">{app.license ?? "—"}</dd>
            <dd className="text-2xs text-muted">{app.openSource ? "OSI Approved" : "Check source"}</dd>
          </div>
          {signals ? (
            <>
              <div className="rounded-xl border border-line bg-surface-2/30 p-3">
                <dt className="flex items-center gap-1 text-2xs font-semibold uppercase tracking-wide text-subtle">
                  <Star className="h-3 w-3" />
                  Stars
                </dt>
                <dd className="mt-1 text-sm font-bold tabular">{formatCompactNumber(signals.stars)}</dd>
                <dd className="text-2xs text-muted">{signals.language ?? "GitHub"}</dd>
              </div>
              <div className="rounded-xl border border-line bg-surface-2/30 p-3">
                <dt className="flex items-center gap-1 text-2xs font-semibold uppercase tracking-wide text-subtle">
                  <GitFork className="h-3 w-3" />
                  Forks
                </dt>
                <dd className="mt-1 text-sm font-bold tabular">{formatCompactNumber(signals.forks)}</dd>
                <dd className="text-2xs text-muted">{signals.full_name}</dd>
              </div>
            </>
          ) : null}
        </dl>

        {/* Source links - prominent like Play Store */}
        <div className="space-y-2">
          <p className="text-2xs font-semibold uppercase tracking-wide text-subtle">Direct Source Links</p>
          {repository ? (
            <a
              href={repository}
              target="_blank"
              rel="noopener noreferrer external"
              className="group flex items-center gap-3 rounded-xl border border-line bg-surface p-3 transition-all hover:border-accent/40 hover:shadow-sm hover:-translate-y-0.5"
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-zinc-700 to-zinc-900 text-white shadow-sm">
                <Github className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold group-hover:text-accent">Repository</p>
                <p className="truncate text-xs text-muted">{app.repository}</p>
                <p className="text-2xs text-subtle">Audit code • Star • Fork • Report issues</p>
              </div>
              <ExternalLink className="h-4 w-4 text-subtle group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
            </a>
          ) : null}

          {homepage ? (
            <a
              href={homepage}
              target="_blank"
              rel="noopener noreferrer external"
              className="group flex items-center gap-3 rounded-xl border border-line bg-surface p-3 transition-all hover:border-accent/40 hover:shadow-sm hover:-translate-y-0.5"
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-sm">
                <Globe className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold group-hover:text-accent">Official Homepage</p>
                <p className="truncate text-xs text-muted">{app.homepage}</p>
                <p className="text-2xs text-subtle">Official docs & website</p>
              </div>
              <ExternalLink className="h-4 w-4 text-subtle group-hover:text-accent" />
            </a>
          ) : null}

          {docs && docs !== repository ? (
            <a
              href={docs}
              target="_blank"
              rel="noopener noreferrer external"
              className="group flex items-center gap-3 rounded-xl border border-line bg-surface p-3 transition-all hover:border-accent/40 hover:shadow-sm"
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-500 text-white shadow-sm">
                <BookOpen className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold group-hover:text-accent">Documentation</p>
                <p className="truncate text-xs text-muted">{app.documentation}</p>
              </div>
              <ExternalLink className="h-4 w-4 text-subtle group-hover:text-accent" />
            </a>
          ) : null}
        </div>

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
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-surface-2/60 px-4 text-sm font-medium transition-colors hover:border-accent/50 hover:bg-surface"
            >
              <GitBranch className="h-3.5 w-3.5" aria-hidden />
              Repository
              <ExternalLink className="h-3 w-3 text-subtle" aria-hidden />
            </a>
          ) : null}
        </div>

        <div className="rounded-xl border border-success/20 bg-success/5 p-3 flex gap-2.5">
          <ShieldCheck className="h-4 w-4 text-success shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-success">Transparency First — Like F-Droid</p>
            <p className="mt-1 text-2xs leading-relaxed text-muted">
              Source code is always linked. Every download is direct from GitHub releases, never mirrored. 
              Validated assets only. You can audit, build, and verify yourself. No hidden binaries.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
