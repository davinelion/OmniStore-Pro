"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { CloudOff, CloudUpload, Heart, RefreshCw } from "lucide-react";

import type { App } from "@omnistore/shared-models";
import { getOmnisource } from "@/lib/omnisource";
import { AppCard } from "@/components/app/AppCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLibrary } from "@/lib/library/use-library";
import type { ListKind } from "@/lib/library/types";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/formatters";

/**
 * Library tabs — favorites / bookmarks / watchlist. Local (IndexedDB) first;
 * when signed in the favorites mirror to the OmniSource profile.
 */
export function LibraryTabs() {
  const t = useTranslations("library");
  const { library, sync, toggle, signIn, signOut } = useLibrary();
  const [tab, setTab] = useState<ListKind>("favorites");
  const [appsById, setAppsById] = useState<Map<string, App>>(new Map());
  const [email, setEmail] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState(false);

  const ids = library[tab];

  // Resolve ids → App cards through OmniSource. Each id is requested exactly
  // once per page load (ref-guarded, deps keyed on ids only) so a re-render
  // can never cancel an in-flight request and drop the result.
  const requestedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const missing = ids.filter((id) => !requestedRef.current.has(id));
    if (missing.length === 0) return;
    for (const id of missing) requestedRef.current.add(id);
    let cancelled = false;
    void (async () => {
      const results = await Promise.allSettled(missing.map((id) => getOmnisource().getApp(id)));
      if (cancelled) return;
      setAppsById((previous) => {
        const next = new Map(previous);
        results.forEach((result, index) => {
          const id = missing[index]!;
          if (result.status === "fulfilled" && result.value) next.set(id, result.value);
        });
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [ids]);

  const apps = useMemo(
    () => ids.map((id) => appsById.get(id)).filter((app): app is App => app != null),
    [ids, appsById],
  );


  const TABS: Array<{ kind: ListKind; label: string; icon: typeof Heart }> = [
    { kind: "favorites", label: t("favorites"), icon: Heart },
    { kind: "bookmarks", label: t("bookmarks"), icon: Heart },
    { kind: "watchlist", label: t("watchlist"), icon: Heart },
  ];

  const emptyText = {
    favorites: t("emptyFavorites"),
    bookmarks: t("emptyBookmarks"),
    watchlist: t("emptyWatchlist"),
  }[tab];

  return (
    <div className="space-y-5">
      {/* Tabs + sync status */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label={t("title")} className="flex flex-wrap gap-1.5">
          {TABS.map(({ kind, label }) => (
            <button
              key={kind}
              type="button"
              role="tab"
              aria-selected={tab === kind}
              onClick={() => setTab(kind)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                tab === kind
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-line bg-surface text-muted hover:text-fg",
              )}
            >
              {label}
              <span className="ms-1.5 text-2xs tabular-nums opacity-70">
                {library[kind].length}
              </span>
            </button>
          ))}
        </div>
        <SyncControls
          sync={sync.status}
          email={sync.status === "synced" ? "session" : null}
          onSignIn={signIn}
          onSignOut={signOut}
          signingIn={signingIn}
        />
      </div>

      {/* Sign-in (cloud mode) */}
      {!sync || sync.status === "local" ? (
        <form
          className="card flex flex-col gap-2 p-4 sm:flex-row sm:items-center"
          onSubmit={async (event) => {
            event.preventDefault();
            setSigningIn(true);
            setError(false);
            const ok = await signIn(email);
            setSigningIn(false);
            if (!ok) setError(true);
          }}
        >
          <label htmlFor="library-email" className="sr-only">
            {t("email")}
          </label>
          <Input
            id="library-email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t("email")}
            className="sm:max-w-xs"
          />
          <Button type="submit" disabled={signingIn}>
            {signingIn ? t("syncing") : t("signIn")}
          </Button>
          <p className="text-2xs text-subtle sm:max-w-xs">{t("privacyNote")}</p>
          {error ? (
            <p className="text-2xs text-danger" role="alert">
              {t("syncError")}
            </p>
          ) : null}
        </form>
      ) : null}

      {/* Items */}
      {apps.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {apps.map((app) => (
            <div key={app.id} className="space-y-1.5">
              <AppCard app={app} />
              <button
                type="button"
                onClick={() => toggle(tab, app.id)}
                className="ms-1 text-2xs text-subtle hover:text-danger hover:underline"
              >
                {t("remove")}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-12 text-center text-sm text-muted">{emptyText}</p>
      )}
    </div>
  );
}

function SyncControls({
  sync,
  onSignIn: _onSignIn,
  onSignOut,
  signingIn,
}: {
  sync: string;
  email: string | null;
  onSignIn: (email: string) => Promise<boolean>;
  onSignOut: () => Promise<void>;
  signingIn?: boolean;
}) {
  const t = useTranslations("library");
  void _onSignIn;
  void signingIn;
  if (sync === "local") {
    return (
      <p className="inline-flex items-center gap-1.5 text-xs text-muted">
        <CloudOff className="h-3.5 w-3.5" aria-hidden />
        {t("syncOff")}
      </p>
    );
  }
  if (sync === "syncing") {
    return (
      <p className="inline-flex items-center gap-1.5 text-xs text-muted" aria-live="polite">
        <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden />
        {t("syncing")}
      </p>
    );
  }
  if (sync === "error") {
    return (
      <p className="inline-flex items-center gap-1.5 text-xs text-warning">
        <CloudOff className="h-3.5 w-3.5" aria-hidden />
        {t("syncError")}
        <button type="button" onClick={() => void onSignOut()} className="underline">
          {t("signOut")}
        </button>
      </p>
    );
  }
  return (
    <div className="inline-flex items-center gap-2 text-xs text-muted">
      <span className="inline-flex items-center gap-1.5 text-success">
        <CloudUpload className="h-3.5 w-3.5" aria-hidden />
        {t("syncOn")}
      </span>
      <button
        type="button"
        onClick={() => void onSignOut()}
        className="text-subtle hover:text-fg hover:underline"
      >
        {t("signOut")}
      </button>
    </div>
  );
}

export function formatSynced(at: string): string {
  return formatDateTime(at);
}
