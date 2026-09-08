import Link from "next/link";
import { ChevronRight } from "lucide-react";

import type { Release } from "@/lib/schemas/omnisource";
import { formatDate, relativeTime } from "@/lib/formatters";
import { sanitizeMarkdown } from "@/lib/security/urls";
import { Badge } from "@/components/ui/primitives";

/**
 * Release history with expandable notes.
 *
 * Built on native <details>/<summary> so it is keyboard and screen-reader
 * accessible without JavaScript, and release notes are sanitised before they
 * are rendered.
 */
export function ReleaseHistory({
  releases,
  limit,
  showAllHref,
}: {
  releases: Release[];
  limit?: number;
  showAllHref?: string;
}) {
  const visible = limit ? releases.slice(0, limit) : releases;

  if (releases.length === 0) {
    return <p className="text-sm text-muted">No releases have been published upstream.</p>;
  }

  return (
    <div className="space-y-3">
      <ol className="space-y-2">
        {visible.map((release, index) => {
          const notes = sanitizeMarkdown(release.notes);
          return (
            <li key={release.id} className="rounded-xl border border-line bg-surface">
              <details open={index === 0} className="group">
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 p-3 text-sm">
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-fg-subtle transition-transform group-open:rotate-90"
                    aria-hidden
                  />
                  <span className="font-semibold">v{release.version}</span>
                  {release.prerelease ? <Badge tone="warning">Pre-release</Badge> : null}
                  <span className="text-fg-subtle">
                    {release.released_at ? (
                      <>
                        <span className="hidden sm:inline">Released </span>
                        {formatDate(release.released_at)}
                        <span className="hidden text-fg-subtle sm:inline"> · {relativeTime(release.released_at)}</span>
                      </>
                    ) : (
                      "Release date not available"
                    )}
                  </span>
                  {release.assets.length > 0 ? (
                    <span className="ml-auto text-2xs text-fg-subtle">
                      {release.assets.length} package{release.assets.length === 1 ? "" : "s"}
                    </span>
                  ) : null}
                </summary>
                <div className="border-t border-line px-3 py-3">
                  {notes ? (
                    <div className="release-notes max-h-72 overflow-y-auto">{notes}</div>
                  ) : (
                    <p className="text-sm text-muted">No release notes were published for this version.</p>
                  )}
                </div>
              </details>
            </li>
          );
        })}
      </ol>

      {showAllHref && releases.length > (limit ?? releases.length) ? (
        <Link href={showAllHref} className="inline-flex items-center gap-1 text-sm text-accent hover:underline">
          View all {releases.length} releases
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}
