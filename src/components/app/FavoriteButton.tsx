"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { BookmarkPlus, Eye, Heart, Plus } from "lucide-react";

import type { ListKind } from "@/lib/library/types";
import { useLibrary } from "@/lib/library/use-library";
import { cn } from "@/lib/utils";

/**
 * Library actions — favorite / bookmark / watch, local-first (IndexedDB),
 * cloud-synced when signed in. Heart animation respects reduced motion via
 * CSS (global reduced-motion rule).
 */
export function FavoriteButton({
  appId,
  kind = "favorites",
  withLabel = false,
  className,
}: {
  appId: string;
  kind?: ListKind;
  withLabel?: boolean;
  className?: string;
}) {
  const t = useTranslations("app");
  const { toggle, has } = useLibrary();
  const active = has(kind, appId);

  const config = {
    favorites: {
      on: t("favoritesRemove"),
      off: t("favoritesAdd"),
      icon: Heart,
      activeClasses: "border-danger/50 bg-danger/10 text-danger",
    },
    bookmarks: {
      on: t("bookmarkRemove"),
      off: t("bookmarkAdd"),
      icon: BookmarkPlus,
      activeClasses: "border-accent/50 bg-accent-soft text-accent",
    },
    watchlist: {
      on: t("watchRemove"),
      off: t("watchAdd"),
      icon: Eye,
      activeClasses: "border-info/50 bg-info/10 text-info",
    },
  }[kind];

  const Icon = config.icon;

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? config.on : config.off}
      title={active ? config.on : config.off}
      onClick={() => toggle(kind, appId)}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-all active:scale-95",
        active ? config.activeClasses : "border-line bg-surface text-muted hover:border-accent/40 hover:text-fg",
        className,
      )}
    >
      <Icon
        className={cn("h-4 w-4", active && kind === "favorites" && "fill-current")}
        aria-hidden
      />
      {withLabel ? <span>{active ? config.on : config.off}</span> : null}
    </button>
  );
}

/** Dropdown-free inline "add to collection" control for the app page. */
export function AddToCollectionButton({ appId }: { appId: string }) {
  const t = useTranslations("collections");
  const { library, addToCollection, createCollection } = useLibrary();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  if (library.collections.length === 0 && !open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-muted transition-colors hover:border-accent/40 hover:text-fg"
      >
        <Plus className="h-4 w-4" aria-hidden />
        {t("addApp")}
      </button>
    );
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-muted transition-colors hover:border-accent/40 hover:text-fg"
      >
        <Plus className="h-4 w-4" aria-hidden />
        {t("addApp")}
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute end-0 top-full z-40 mt-2 w-60 rounded-2xl border border-line bg-surface p-2 shadow-raised"
        >
          {library.collections.map((collection) => (
            <button
              key={collection.id}
              type="button"
              role="menuitem"
              onClick={() => {
                addToCollection(collection.id, appId);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-start text-sm hover:bg-surface-2"
            >
              <span className="truncate">{collection.name}</span>
              {collection.appIds.includes(appId) ? (
                <span className="text-2xs text-accent">✓</span>
              ) : null}
            </button>
          ))}
          {creating ? (
            <form
              className="mt-1 border-t border-line pt-2"
              onSubmit={(event) => {
                event.preventDefault();
                const collection = createCollection(name);
                if (collection) addToCollection(collection.id, appId);
                setName("");
                setCreating(false);
                setOpen(false);
              }}
            >
              <input
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t("namePlaceholder")}
                className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent/60"
              />
              <button
                type="submit"
                className="mt-1.5 w-full rounded-xl bg-accent px-3 py-2 text-sm font-medium text-accent-fg"
              >
                {t("create")}
              </button>
            </form>
          ) : (
            <button
              type="button"
              role="menuitem"
              onClick={() => setCreating(true)}
              className="mt-1 flex w-full items-center gap-2 rounded-xl border border-dashed border-line px-3 py-2 text-start text-sm text-muted hover:border-accent/40 hover:text-fg"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              {t("create")}
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
