import Link from "next/link";
import type { App } from "@/lib/schemas/omnisource";
import { PlatformBadge } from "@/components/platform/PlatformBadge";
import { relativeTime } from "@/lib/utils";

export function AppCard({ app }: { app: App }) {
  return (
    <article className="group rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4 transition hover:border-accent">
      <Link href={`/apps/${app.slug}`} className="flex gap-3">
        <AppIcon name={app.name} src={app.icon} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate font-medium">{app.name}</h3>
            {app.scores?.trust != null && (
              <span className="shrink-0 text-xs text-[var(--muted)]">{app.scores.trust}</span>
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">
            {app.short_description ?? "Description unavailable"}
          </p>
          <p className="mt-2 text-xs text-[var(--muted)]">
            {app.categories[0] ?? "Uncategorized"}
            {app.latest_release?.version ? ` · ${app.latest_release.version}` : ""}
            {app.updated_at ? ` · ${relativeTime(app.updated_at)}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {app.platforms.slice(0, 5).map((p) => (
              <PlatformBadge key={p} platform={p} />
            ))}
          </div>
        </div>
      </Link>
      <div className="mt-3 hidden gap-2 md:flex">
        <Link href={`/apps/${app.slug}`} className="rounded-full border border-[var(--line)] px-3 py-1 text-sm">
          View
        </Link>
        <Link href={`/apps/${app.slug}#get`} className="rounded-full bg-accent px-3 py-1 text-sm text-white">
          Get
        </Link>
      </div>
    </article>
  );
}

export function AppIcon({ name, src }: { name: string; src?: string }) {
  const letter = name.slice(0, 1).toUpperCase();
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        width={48}
        height={48}
        className="h-12 w-12 rounded-xl object-cover"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
    );
  }
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15 text-lg font-semibold text-accent" aria-hidden>
      {letter}
    </div>
  );
}

export function AppCardSkeleton() {
  return <div className="h-36 animate-pulse rounded-2xl bg-[var(--line)]/50" />;
}
