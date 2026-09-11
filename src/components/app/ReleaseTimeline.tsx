import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";

import type { Release } from "@omnistore/shared-models";
import { formatDateTime } from "@/lib/formatters";

/**
 * Release timeline. Notes are rendered as plain text (`.release-notes`
 * escapes HTML) — upstream release bodies are never trusted as markup.
 */
export function ReleaseTimeline({
  releases,
  limit,
}: {
  releases: Release[];
  limit?: number;
}) {
  const t = useTranslations("app");
  const visible = limit ? releases.slice(0, limit) : releases;
  if (visible.length === 0) return null;

  return (
    <ol className="space-y-5">
      {visible.map((release) => (
        <li key={release.version} className="relative ps-6">
          <span
            aria-hidden
            className="absolute start-0 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-accent bg-bg"
          />
          <span aria-hidden className="absolute start-[4.5px] top-5 h-[calc(100%-1rem)] w-px bg-line" />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h3 className="font-mono text-sm font-semibold">{release.version}</h3>
            {release.releasedAt ? (
              <time dateTime={release.releasedAt} className="text-xs text-subtle">
                {formatDateTime(release.releasedAt)}
              </time>
            ) : null}
            {release.hasBreakingChanges ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-2xs font-medium text-warning">
                <AlertTriangle className="h-3 w-3" aria-hidden />
                {t("breakingChanges")}
              </span>
            ) : null}
          </div>
          {release.notes ? (
            <p className="release-notes mt-1.5 line-clamp-6">{release.notes}</p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
