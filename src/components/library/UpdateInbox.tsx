"use client";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useWatch } from "@/hooks/useLocalCollections";
import { usePersistentState } from "@/hooks/usePersistentState";
import { omniClient, userFacingError } from "@/lib/api/client";
import { PLATFORM_IDS, PlatformSchema } from "@/lib/schemas/omnisource";
import { updateItems } from "@/lib/library/model";
import { Button } from "@/components/ui/button";
import { formatDate, platformLabel } from "@/lib/formatters";

const StateSchema = z.object({
  read: z.array(z.string()).max(10000),
  prereleases: z.boolean(),
  platform: PlatformSchema.or(z.literal("all")),
});
const INITIAL: z.infer<typeof StateSchema> = {
  read: [],
  prereleases: false,
  platform: "all",
};
export function UpdateInbox() {
  const watch = useWatch();
  const state = usePersistentState("omnistore:inbox:v1", StateSchema, INITIAL);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const query = useQuery({
    queryKey: ["followed-releases", watch.ids],
    queryFn: () => omniClient.getAppsByIds(watch.ids),
    enabled: watch.ids.length > 0,
  });
  const items = updateItems(query.data?.items ?? [], state.value);
  const unread = items.filter((i) => !state.value.read.includes(i.key));
  const visible = unreadOnly ? unread : items;
  function mark(keys: string[], read: boolean) {
    state.update((s) => ({
      ...s,
      read: read
        ? [...new Set([...s.read, ...keys])].slice(-10000)
        : s.read.filter((k) => !keys.includes(k)),
    }));
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <Link className="text-accent underline" href="/favorites">
          Manage followed apps
        </Link>
        <a className="text-accent underline" href="/api/v1/feed">
          Catalog RSS feed
        </a>
      </div>
      <p className="text-sm text-muted">
        Release history from apps you follow, not installed-app detection.
        Existing releases start unread. Read state and preferences stay on this
        device.
      </p>
      {state.error && <p role="alert">{state.error}</p>}
      <fieldset
        disabled={!state.ready}
        className="card flex flex-wrap items-center gap-5 p-4"
      >
        <legend className="sr-only">Inbox preferences</legend>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={state.value.prereleases}
            onChange={(e) =>
              state.update((s) => ({ ...s, prereleases: e.target.checked }))
            }
          />{" "}
          Include prereleases
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => setUnreadOnly(e.target.checked)}
          />{" "}
          Unread only ({unread.length})
        </label>
        <label>
          Platform{" "}
          <select
            className="rounded border border-line bg-surface p-2"
            value={state.value.platform}
            onChange={(e) =>
              state.update((s) => ({
                ...s,
                platform: PlatformSchema.or(z.literal("all")).parse(
                  e.target.value,
                ),
              }))
            }
          >
            <option value="all">All platforms</option>
            {PLATFORM_IDS.map((p) => (
              <option key={p} value={p}>
                {platformLabel(p)}
              </option>
            ))}
          </select>
        </label>
        <Button
          variant="outline"
          disabled={!unread.length}
          onClick={() =>
            mark(
              items.map((i) => i.key),
              true,
            )
          }
        >
          Mark filtered releases read
        </Button>
      </fieldset>
      {!state.ready ? (
        <p role="status">Loading preferences…</p>
      ) : !watch.ids.length ? (
        <div className="card p-8">
          <h2 className="text-xl font-semibold">
            Your next release starts here
          </h2>
          <p className="my-3 text-muted">
            Follow an app on its detail page to see its releases here.
          </p>
          <Link href="/apps" className="text-accent underline">
            Find apps to follow
          </Link>
        </div>
      ) : query.isPending ? (
        <p role="status">Loading releases…</p>
      ) : query.isError ? (
        <div role="alert">
          <p>{userFacingError(query.error)}</p>
          <Button onClick={() => query.refetch()}>Retry</Button>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted">
            {items.length} releases in the available snapshot. Platform filters
            require a matching release asset; older history may not be included.
          </p>
          {!visible.length && (
            <p className="card p-6">
              No releases match these filters. You’re all caught up, or this
              snapshot has no matching releases.
            </p>
          )}
          {visible.map(({ app, release, key }) => (
            <article
              key={key}
              className="card flex flex-wrap items-start justify-between gap-4 p-5"
            >
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wider text-accent">
                  {state.value.read.includes(key) ? "Read" : "Unread"}
                  {release.prerelease ? " · Prerelease" : " · Stable"}
                </p>
                <h2 className="text-xl font-semibold">
                  <Link href={`/apps/${app.slug}`}>
                    {app.name}{" "}
                    <span className="text-muted">{release.version}</span>
                  </Link>
                </h2>
                <p className="text-sm text-muted">
                  {formatDate(release.released_at)}
                </p>
                <Link
                  className="text-accent underline"
                  href={`/apps/${app.slug}/releases`}
                >
                  Read release notes
                </Link>
              </div>
              <Button
                variant="outline"
                onClick={() => mark([key], !state.value.read.includes(key))}
              >
                {state.value.read.includes(key) ? "Mark unread" : "Mark read"}
              </Button>
            </article>
          ))}
        </>
      )}
    </div>
  );
}
