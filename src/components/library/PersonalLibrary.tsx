"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFavorites } from "@/hooks/useLocalCollections";
import { usePersistentState } from "@/hooks/usePersistentState";
import {
  LibrarySchema,
  EMPTY_LIBRARY,
  parseLibrary,
  parseSharedList,
  shareList,
  MAX_BACKUP_BYTES,
  type PersonalList,
} from "@/lib/library/model";
import { omniClient, userFacingError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";

export function PersonalLibrary() {
  const store = usePersistentState(
    "omnistore:library:v1",
    LibrarySchema,
    EMPTY_LIBRARY,
  );
  const favorites = useFavorites();
  const [name, setName] = useState("");
  const [selected, setSelected] = useState("");
  const [message, setMessage] = useState("");
  const [shared, setShared] = useState<PersonalList | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const active =
    store.value.lists.find((l) => l.id === selected) ?? store.value.lists[0];
  const ids = [
    ...new Set([
      ...favorites.ids,
      ...(active?.entries.map((e) => e.appId) ?? []),
      ...(shared?.entries.map((e) => e.appId) ?? []),
    ]),
  ];
  const query = useQuery({
    queryKey: ["library-apps", ids],
    queryFn: () => omniClient.getAppsByIds(ids),
    enabled: ids.length > 0,
  });
  const apps = new Map(query.data?.items.map((a) => [a.id, a]));
  useEffect(() => {
    function read() {
      if (!location.hash.startsWith("#list=")) return;
      try {
        setShared(parseSharedList(location.hash.slice(6)));
      } catch {
        setMessage("This shared list is invalid or too large.");
      }
    }
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  function mutate(fn: Parameters<typeof store.update>[0]) {
    try {
      store.update(fn);
      setMessage("");
    } catch {
      setMessage(
        "Unable to save: maximum 50 lists, 200 unique apps per list, 80-character names, and 1,000-character notes.",
      );
    }
  }
  function addList(listName: string, entries: PersonalList["entries"] = []) {
    const id = crypto.randomUUID();
    mutate((s) => ({
      ...s,
      lists: [...s.lists, { id, name: listName, entries }],
    }));
    setSelected(id);
  }
  function changeList(fn: (list: PersonalList) => PersonalList) {
    if (!active) return;
    mutate((s) => ({
      ...s,
      lists: s.lists.map((l) => (l.id === active.id ? fn(l) : l)),
    }));
  }
  function download() {
    const blob = new Blob([JSON.stringify(store.value, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "omnistore-library.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error();
      const incoming = parseLibrary(await file.text());
      // Import is additive: never silently replace the user's library.
      mutate((s) => ({
        ...s,
        lists: [
          ...s.lists,
          ...incoming.lists.map((l) => ({ ...l, id: crypto.randomUUID() })),
        ],
      }));
    } catch {
      setMessage(
        "Invalid backup. Use a version 1 OmniStore library JSON file under 1 MB. Nothing was imported.",
      );
    }
  }
  if (!store.ready) return <p role="status">Loading your library…</p>;
  return (
    <div className="space-y-6">
      <p className="text-muted">
        Private, device-local lists. Add apps from your favorites, attach notes,
        and take your library with you. Shared links exclude notes; backups
        include them.
      </p>
      {store.error && <p role="alert">{store.error}</p>}
      {message && <p role="status">{message}</p>}
      {shared && (
        <section className="card space-y-3 border-accent p-5">
          <h2 className="text-xl font-semibold">
            Shared collection: {shared.name}
          </h2>
          <p className="text-sm text-muted">
            Shared by someone else; this is not an OmniStore endorsement.
            Nothing is saved until you import it.
          </p>
          <ul className="space-y-2">
            {shared.entries.map((e) => (
              <li key={e.appId}>
                {apps.get(e.appId) ? (
                  <Link
                    className="text-accent underline"
                    href={`/apps/${apps.get(e.appId)!.slug}`}
                  >
                    {apps.get(e.appId)!.name}
                  </Link>
                ) : (
                  e.appId
                )}
              </li>
            ))}
          </ul>
          <Button onClick={() => addList(shared.name, shared.entries)}>
            Save a copy to my library
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setShared(null);
              history.replaceState(null, "", location.pathname);
            }}
          >
            Dismiss
          </Button>
        </section>
      )}
      <section className="card flex flex-wrap items-end gap-4 p-5">
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) {
              addList(name.trim());
              setName("");
            }
          }}
        >
          <label className="space-y-1">
            Collection name
            <input
              className="block rounded-lg border border-line bg-bg p-2"
              maxLength={80}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Linux setup"
            />
          </label>
          <Button type="submit">Create collection</Button>
        </form>
        <Button variant="outline" onClick={download}>
          Export backup
        </Button>
        <label className="text-sm">
          Import backup (adds lists)
          <input
            className="mt-1 block max-w-64"
            type="file"
            accept="application/json,.json"
            onChange={(e) => {
              void importFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
      </section>
      {active ? (
        <div className="grid gap-6 md:grid-cols-[240px_1fr]">
          <nav aria-label="Personal collections" className="space-y-2">
            {store.value.lists.map((l) => (
              <button
                key={l.id}
                onClick={() => {
                  setSelected(l.id);
                  setShareUrl("");
                }}
                aria-pressed={active.id === l.id}
                className={`w-full rounded-xl border p-3 text-left ${active.id === l.id ? "border-accent bg-accent/10" : "border-line"}`}
              >
                {l.name}
                <span className="block text-sm text-muted">
                  {l.entries.length} apps
                </span>
              </button>
            ))}
          </nav>
          <section className="card space-y-5 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-semibold">{active.name}</h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    try {
                      setShareUrl(
                        `${location.origin}/library#list=${shareList(active)}`,
                      );
                    } catch (e) {
                      setMessage((e as Error).message);
                    }
                  }}
                >
                  Create share link
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (
                      confirm(
                        `Delete “${active.name}”? Export a backup first if needed.`,
                      )
                    )
                      mutate((s) => ({
                        ...s,
                        lists: s.lists.filter((l) => l.id !== active.id),
                      }));
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
            <label className="block text-sm">
              Rename collection
              <input
                key={active.id}
                className="ml-3 rounded border border-line bg-bg p-2"
                defaultValue={active.name}
                maxLength={80}
                onBlur={(e) => {
                  if (e.target.value.trim())
                    changeList((l) => ({ ...l, name: e.target.value.trim() }));
                }}
              />
            </label>
            {shareUrl && (
              <label className="block text-sm">
                Anyone with this link can view app IDs and the collection name.
                Private notes are excluded.
                <input
                  className="mt-2 w-full rounded border border-line bg-bg p-2"
                  readOnly
                  value={shareUrl}
                  onFocus={(e) => e.target.select()}
                  aria-label="Share link"
                />
              </label>
            )}
            <label className="block">
              Add a favorite{" "}
              <select
                className="ml-2 max-w-full rounded border border-line bg-bg p-2"
                value=""
                onChange={(e) => {
                  const appId = e.target.value;
                  if (appId)
                    changeList((l) => ({
                      ...l,
                      entries: [...l.entries, { appId, note: "" }],
                    }));
                }}
              >
                <option value="">Choose an app…</option>
                {favorites.ids
                  .filter((id) => !active.entries.some((e) => e.appId === id))
                  .map((id) => (
                    <option key={id} value={id}>
                      {apps.get(id)?.name ?? id}
                    </option>
                  ))}
              </select>
            </label>
            <p className="text-sm text-muted">
              <Link href="/apps" className="text-accent underline">
                Browse apps
              </Link>{" "}
              and favorite them to make them available here.
            </p>
            {query.isError && (
              <div role="alert">
                {userFacingError(query.error)}{" "}
                <Button onClick={() => query.refetch()}>Retry</Button>
              </div>
            )}
            {query.isPending && ids.length > 0 && (
              <p role="status">Loading app details…</p>
            )}
            {!active.entries.length && (
              <p className="rounded-xl border border-dashed border-line p-6 text-muted">
                This collection is ready for your first app.
              </p>
            )}
            {active.entries.map((entry) => (
              <article
                key={entry.appId}
                className="space-y-3 border-t border-line pt-4"
              >
                <div className="flex items-center justify-between gap-3">
                  {apps.get(entry.appId) ? (
                    <Link
                      className="text-lg font-semibold text-accent"
                      href={`/apps/${apps.get(entry.appId)!.slug}`}
                    >
                      {apps.get(entry.appId)!.name}
                    </Link>
                  ) : (
                    <p>
                      {entry.appId} —{" "}
                      {query.isPending ? "Loading" : "Not in current catalog"}
                    </p>
                  )}
                  <Button
                    variant="ghost"
                    onClick={() =>
                      changeList((l) => ({
                        ...l,
                        entries: l.entries.filter(
                          (e) => e.appId !== entry.appId,
                        ),
                      }))
                    }
                  >
                    Remove
                  </Button>
                </div>
                <label className="block text-sm">
                  Private note
                  <textarea
                    className="mt-1 block w-full rounded-lg border border-line bg-bg p-3"
                    maxLength={1000}
                    value={entry.note}
                    onChange={(e) =>
                      changeList((l) => ({
                        ...l,
                        entries: l.entries.map((item) =>
                          item.appId === entry.appId
                            ? { ...item, note: e.target.value }
                            : item,
                        ),
                      }))
                    }
                  />
                </label>
              </article>
            ))}
          </section>
        </div>
      ) : (
        <div className="card p-8">
          <h2 className="text-xl font-semibold">Build your personal toolkit</h2>
          <p className="mt-2 text-muted">
            Create your first collection above. No account or database required.
          </p>
        </div>
      )}
    </div>
  );
}
