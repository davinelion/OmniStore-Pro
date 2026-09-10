"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { GitCompare, Plus, Search, X } from "lucide-react";

import { omniClient, queryKeys, userFacingError } from "@/lib/api/client";
import { useComparison } from "@/hooks/useComparison";
import { MAX_COMPARE } from "@/lib/compare";
import { AppIcon } from "@/components/app/AppIcon";
import { PlatformAvailability } from "@/components/platform/PlatformBadge";
import { Badge, EmptyState, Skeleton } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { formatDate, NOT_AVAILABLE, packageTypeLabel, platformLabel } from "@/lib/formatters";
import type { App } from "@/lib/schemas/omnisource";
import { flags } from "@/config/flags";
import { cn } from "@/lib/utils";

/**
 * App comparison — one of OmniStore's differentiators.
 *
 * The selection is shareable: it lives in the URL as well as local storage.
 * A shared link is resolved on the server (see page.tsx) so the comparison
 * renders immediately instead of flashing an empty state.
 */
export function CompareView({
  initialIds,
  initialApps = [],
}: {
  initialIds: string[];
  /** Resolved on the server so a shared link renders without client JS. */
  initialApps?: App[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const comparison = useComparison();
  const [query, setQuery] = useState("");
  const [seeded, setSeeded] = useState(false);

  const urlIds = (params.get("ids") ?? "").split(",").map((id) => id.trim()).filter(Boolean);

  // A shared link wins once: adopt ids resolved by the server.
  useEffect(() => {
    if (seeded) return;
    if (initialIds.length > 0) {
      comparison.clear();
      initialIds.slice(0, MAX_COMPARE).forEach((id) => comparison.add(id));
    }
    setSeeded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialIds.join(","), seeded]);

  const ids = seeded ? comparison.ids : initialIds.slice(0, MAX_COMPARE);

  // Keep the URL in step with the selection.
  useEffect(() => {
    const next = ids.join(",");
    const current = params.get("ids") ?? "";
    if (next !== current) {
      router.replace(next ? `/compare?ids=${next}` : "/compare", { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(",")]);

  const appsQuery = useQuery({
    queryKey: queryKeys.appsByIds(ids),
    queryFn: () => omniClient.getAppsByIds(ids),
    enabled: ids.length > 0,
  });

  const searchQuery = useQuery({
    queryKey: ["compare-search", query],
    queryFn: () => omniClient.search({ q: query, perPage: 8 }),
    enabled: query.trim().length > 1,
    staleTime: 60_000,
  });

  const apps = useMemo(() => {
    const byId = new Map((appsQuery.data?.items ?? initialApps).map((app) => [app.id, app]));
    return ids.map((id) => byId.get(id)).filter((app): app is App => Boolean(app));
  }, [appsQuery.data, initialApps, ids]);

  if (!flags.comparison) {
    return <EmptyState title="Comparison is currently disabled." />;
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight">
          <GitCompare className="h-7 w-7 text-accent" aria-hidden />
          Compare Apps
        </h1>
        <p className="text-muted">
          Select 2–{MAX_COMPARE} applications to compare platforms, packages, licence and scores side
          by side.
        </p>
      </header>

      <section aria-labelledby="picker-heading" className="space-y-3">
        <h2 id="picker-heading" className="text-sm font-semibold">
          Add applications
        </h2>

        <div className="flex flex-wrap gap-2">
          {ids.map((id) => {
            const app = apps.find((item) => item.id === id);
            return (
              <span
                key={id}
                className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-sm"
              >
                {app ? <AppIcon name={app.name} src={app.icon_url} size="sm" className="h-4 w-4 rounded" /> : null}
                {app?.name ?? id}
                <button
                  type="button"
                  onClick={() => comparison.remove(id)}
                  className="rounded-full p-0.5 text-fg-subtle transition-colors hover:text-danger"
                  aria-label={`Remove ${app?.name ?? id} from comparison`}
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </span>
            );
          })}
          {ids.length === 0 ? (
            <p className="text-sm text-muted">Nothing selected yet — search below to add apps.</p>
          ) : null}
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-2.5 focus-within:border-accent/60">
          <Search className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search apps to compare…"
            aria-label="Search apps to compare"
            className="w-full bg-transparent text-sm outline-none placeholder:text-fg-subtle"
          />
        </div>

        {searchQuery.data && searchQuery.data.items.length > 0 ? (
          <ul className="grid gap-2 sm:grid-cols-2">
            {searchQuery.data.items.map((app) => {
              const selected = comparison.has(app.id);
              return (
                <li key={app.id}>
                  <button
                    type="button"
                    onClick={() => comparison.toggle(app.id)}
                    disabled={!selected && comparison.isFull}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors disabled:opacity-50",
                      selected ? "border-accent/50 bg-accent-soft/40" : "border-line hover:bg-surface-2",
                    )}
                  >
                    <AppIcon name={app.name} src={app.icon_url} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{app.name}</span>
                      <span className="block truncate text-2xs text-fg-subtle">
                        {app.platforms.map(platformLabel).join(" · ") || NOT_AVAILABLE}
                      </span>
                    </span>
                    {selected ? (
                      <span className="text-2xs text-accent">Selected</span>
                    ) : (
                      <Plus className="h-4 w-4 text-fg-subtle" aria-hidden />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}

        {comparison.isFull ? (
          <p className="text-2xs text-fg-subtle">You can compare up to {MAX_COMPARE} applications.</p>
        ) : null}
      </section>

      {appsQuery.isPending && apps.length === 0 && ids.length > 0 ? (
        <Skeleton className="h-64 w-full" />
      ) : appsQuery.isError ? (
        <p role="alert" className="text-sm text-danger">
          {userFacingError(appsQuery.error)}
        </p>
      ) : apps.length < 2 ? (
        <EmptyState
          icon={<GitCompare className="h-6 w-6" aria-hidden />}
          title="Select at least two applications to compare."
          description="Search above and add two to four apps."
        />
      ) : (
        <ComparisonTable apps={apps} onRemove={(id) => comparison.remove(id)} />
      )}
    </div>
  );
}

function ComparisonTable({ apps, onRemove }: { apps: App[]; onRemove: (id: string) => void }) {
  const rows: Array<{ label: string; render: (app: App) => React.ReactNode }> = [
    {
      label: "Platforms",
      render: (app) => <PlatformAvailability platforms={app.platforms} className="gap-1" />,
    },
    {
      label: "Trust Score",
      render: (app) => <ScoreCell value={app.scores.trust.value} app={app} kind="trust" />,
    },
    {
      label: "Quality Score",
      render: (app) => <ScoreCell value={app.scores.quality.value} app={app} kind="quality" />,
    },
    {
      label: "Popularity",
      render: (app) => <ScoreCell value={app.scores.popularity.value} app={app} kind="popularity" />,
    },
    {
      label: "License",
      render: (app) =>
        app.license ? (
          <span className="text-sm">{app.license.id}</span>
        ) : (
          <span className="text-sm text-fg-subtle">{NOT_AVAILABLE}</span>
        ),
    },
    {
      label: "Open Source",
      render: (app) => (
        <Badge tone={app.open_source ? "success" : "neutral"}>{app.open_source ? "Yes" : NOT_AVAILABLE}</Badge>
      ),
    },
    {
      label: "Latest Version",
      render: (app) => <span className="text-sm">{app.latest_release?.version ?? NOT_AVAILABLE}</span>,
    },
    {
      label: "Last Updated",
      render: (app) => <span className="text-sm">{formatDate(app.updated_at)}</span>,
    },
    {
      label: "Architectures",
      render: (app) => (
        <span className="text-sm">
          {app.architectures.length ? app.architectures.join(", ") : NOT_AVAILABLE}
        </span>
      ),
    },
    {
      label: "Packages",
      render: (app) => (
        <span className="text-sm">
          {app.package_types.length ? app.package_types.map(packageTypeLabel).join(", ") : NOT_AVAILABLE}
        </span>
      ),
    },
    {
      label: "Developer",
      render: (app) =>
        app.developer ? (
          <Link href={`/developers/${app.developer.slug}`} className="text-sm text-accent hover:underline">
            {app.developer.name}
          </Link>
        ) : (
          <span className="text-sm text-fg-subtle">{NOT_AVAILABLE}</span>
        ),
    },
    {
      label: "Stars",
      render: (app) => (
        <span className="text-sm tabular-nums">
          {app.signals.stars == null ? NOT_AVAILABLE : app.signals.stars.toLocaleString("en-US")}
        </span>
      ),
    },
    {
      label: "Releases",
      render: (app) => (
        <span className="text-sm tabular-nums">{app.signals.release_count ?? NOT_AVAILABLE}</span>
      ),
    },
    {
      label: "Release cadence",
      render: (app) => (
        <span className="text-sm">
          {app.signals.release_cadence_days == null
            ? NOT_AVAILABLE
            : `${Math.round(app.signals.release_cadence_days)} days`}
        </span>
      ),
    },
    {
      label: "Categories",
      render: (app) => <span className="text-sm">{app.categories.join(", ") || NOT_AVAILABLE}</span>,
    },
  ];

  return (
    <div className="overflow-x-auto rounded-2xl border border-line">
      <table className="w-full min-w-[52rem] border-collapse text-left">
        <caption className="sr-only">Application comparison</caption>
        <thead>
          <tr className="border-b border-line bg-surface-2/50">
            <th scope="col" className="w-44 p-3 text-sm font-semibold">
              Attribute
            </th>
            {apps.map((app) => (
              <th key={app.id} scope="col" className="min-w-[12rem] p-3 align-top">
                <div className="flex items-start gap-2">
                  <AppIcon name={app.name} src={app.icon_url} size="sm" />
                  <div className="min-w-0 flex-1">
                    <Link href={`/apps/${app.slug}`} className="block truncate font-semibold hover:text-accent">
                      {app.name}
                    </Link>
                    <button
                      type="button"
                      onClick={() => onRemove(app.id)}
                      className="text-2xs text-fg-subtle transition-colors hover:text-danger"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-line last:border-0">
              <th scope="row" className="p-3 align-top text-sm font-medium text-fg-muted">
                {row.label}
              </th>
              {apps.map((app) => (
                <td key={app.id} className="p-3 align-top">
                  {row.render(app)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ScoreCell({ value, app, kind }: { value: number | null; app: App; kind: "trust" | "quality" | "popularity" }) {
  if (value == null) return <span className="text-sm text-fg-subtle">{NOT_AVAILABLE}</span>;
  const factors = app.scores[kind].factors.map((factor) => `${factor.label}: ${factor.detail}`).join("\n");
  return (
    <span className="inline-flex items-baseline gap-1" title={factors}>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
      <span className="text-2xs text-fg-subtle">/ 100</span>
    </span>
  );
}
