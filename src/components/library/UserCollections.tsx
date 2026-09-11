"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, Link2, Plus, Share2, Trash2 } from "lucide-react";

import type { App } from "@omnistore/shared-models";
import { getOmnisource } from "@/lib/omnisource";
import { AppCard } from "@/components/app/AppCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLibrary } from "@/lib/library/use-library";
import { decodeShare, shareUrl } from "@/lib/library/share";
import type { UserCollection } from "@/lib/library/types";

/**
 * User collections (Phase 13) — create, manage, and share via link.
 * Stored locally (IndexedDB), synced with the profile when signed in;
 * sharing encodes the collection into the URL itself.
 */
export function UserCollections() {
  const t = useTranslations("collections");
  const { library, createCollection, removeCollection, importCollection } = useLibrary();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [open, setOpen] = useState(false);
  const [shared, setShared] = useState<string | null>(null);
  const [imported, setImported] = useState<string | null>(null);

  // Import from ?import=<payload>
  useEffect(() => {
    const payload = searchParams.get("import");
    if (!payload) return;
    const parsed = decodeShare(payload);
    if (!parsed) return;
    const collection = importCollection(parsed);
    setImported(collection.name);
    router.replace("/collections/mine");
  }, [searchParams, importCollection, router]);

  async function copyShare(collection: UserCollection) {
    const url = shareUrl(collection);
    try {
      await navigator.clipboard.writeText(url);
      setShared(collection.id);
      setTimeout(() => setShared(null), 2000);
    } catch {
      window.prompt(t("shareHint"), url);
    }
  }

  return (
    <div className="space-y-6">
      {imported ? (
        <p className="rounded-xl border border-success/40 bg-success/10 px-4 py-2.5 text-sm text-success" role="status">
          <Check className="me-1.5 inline h-4 w-4" aria-hidden />
          {t("imported")}: {imported}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">{library.collections.length === 0 ? t("userEmpty") : "\u00a0"}</p>
        <Button onClick={() => setOpen((value) => !value)} size="sm">
          <Plus className="h-4 w-4" aria-hidden />
          {t("create")}
        </Button>
      </div>

      {open ? (
        <form
          className="card space-y-2 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            const collection = createCollection(name, description);
            if (collection) {
              setName("");
              setDescription("");
              setOpen(false);
            }
          }}
        >
          <Input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("namePlaceholder")}
            aria-label={t("namePlaceholder")}
          />
          <Input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={t("descriptionPlaceholder")}
            aria-label={t("descriptionPlaceholder")}
          />
          <Button type="submit" size="sm">
            {t("create")}
          </Button>
        </form>
      ) : null}

      {library.collections.length === 0 ? (
        <div className="card border-dashed p-10 text-center text-sm text-muted">
          {t("userEmpty")}
        </div>
      ) : (
        <ul className="space-y-4">
          {library.collections.map((collection) => (
            <li key={collection.id}>
              <CollectionEditor
                collection={collection}
                shared={shared === collection.id}
                onShare={() => void copyShare(collection)}
                onDelete={() => removeCollection(collection.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CollectionEditor({
  collection,
  shared,
  onShare,
  onDelete,
}: {
  collection: UserCollection;
  shared: boolean;
  onShare: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations("collections");
  const [apps, setApps] = useState<App[]>([]);
  const [expanded, setExpanded] = useState(false);

  // Request each id exactly once per mount (deps keyed on the id list only).
  const requestedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const missing = collection.appIds.filter((id) => !requestedRef.current.has(id));
    if (missing.length === 0) return;
    for (const id of missing) requestedRef.current.add(id);
    let cancelled = false;
    void (async () => {
      const results = await Promise.allSettled(
        missing.map((id) => getOmnisource().getApp(id)),
      );
      if (cancelled) return;
      setApps(
        results
          .filter((result): result is PromiseFulfilledResult<App> => result.status === "fulfilled")
          .map((result) => result.value)
          .filter(Boolean),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [collection.appIds]);

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold">{collection.name}</h3>
          {collection.description ? (
            <p className="truncate text-sm text-muted">{collection.description}</p>
          ) : null}
          <p className="text-2xs text-subtle">{t("apps", { count: collection.appIds.length })}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onShare}
            aria-label={t("share")}
            className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-muted hover:border-accent/50 hover:text-fg"
          >
            {shared ? <Check className="h-3.5 w-3.5 text-success" aria-hidden /> : <Share2 className="h-3.5 w-3.5" aria-hidden />}
            {t("share")}
          </button>
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-muted hover:border-accent/50 hover:text-fg"
          >
            <Link2 className="h-3.5 w-3.5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label={t("delete")}
            className="rounded-full border border-line p-1.5 text-muted hover:border-danger/50 hover:text-danger"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>
      {expanded && apps.length > 0 ? (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {apps.map((app) => (
            <AppCard key={app.id} app={app} layout="compact" />
          ))}
        </div>
      ) : null}
      {expanded && apps.length === 0 ? (
        <p className="mt-3 text-xs text-subtle">
          <Link href="/apps" className="text-accent hover:underline">
            {t("addApp")} →
          </Link>
        </p>
      ) : null}
    </div>
  );
}
