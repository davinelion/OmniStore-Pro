"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Bookmark, Bell, Trash2 } from "lucide-react";

import { omniClient, queryKeys, userFacingError } from "@/lib/api/client";
import { useFavorites, useWatch } from "@/hooks/useLocalCollections";
import { AppCard } from "@/components/app/AppCard";
import { AppGridSkeleton, EmptyState } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { flags } from "@/config/flags";

/**
 * Local favorites and follows.
 *
 * No account, no sync, no server call to read — this is the user's own browser
 * state. App metadata is fetched fresh so versions and scores stay current.
 */
export default function FavoritesPage() {
  const favorites = useFavorites();
  const watch = useWatch();

  const favoritesQuery = useQuery({
    queryKey: queryKeys.appsByIds(favorites.ids),
    queryFn: () => omniClient.getAppsByIds(favorites.ids),
    enabled: favorites.ids.length > 0,
  });

  const watchQuery = useQuery({
    queryKey: queryKeys.appsByIds(watch.ids),
    queryFn: () => omniClient.getAppsByIds(watch.ids),
    enabled: watch.ids.length > 0,
  });

  if (!flags.favorites) {
    return <EmptyState title="Favorites are currently disabled." />;
  }

  const favoriteApps = favoritesQuery.data?.items ?? [];
  const watchedApps = watchQuery.data?.items ?? [];

  return (
    <div className="space-y-12">
      <header className="space-y-2">
        <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight">
          <Bookmark className="h-7 w-7 text-accent" aria-hidden />
          Favorites
        </h1>
        <p className="text-muted">
          Saved on this device. No account required. App IDs are sent to the catalog API to load current metadata.
        </p>
      </header>

      <div className="flex flex-wrap gap-4"><Link className="text-accent underline" href="/updates">Open update inbox</Link><Link className="text-accent underline" href="/library">Organize personal collections</Link></div>

      <section aria-labelledby="saved-heading" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="saved-heading" className="text-xl font-semibold">
            Saved apps
          </h2>
          {favoriteApps.length > 0 ? (
            <Button variant="ghost" size="sm" onClick={favorites.clear}>
              <Trash2 className="h-4 w-4" aria-hidden />
              Clear all
            </Button>
          ) : null}
        </div>

        {favorites.ids.length === 0 ? (
          <EmptyState
            icon={<Bookmark className="h-6 w-6" aria-hidden />}
            title="No favorites yet."
            description="Tap the Favorite button on any app to keep it here."
            action={
              <Link
                href="/apps"
                className="inline-flex h-9 items-center rounded-full bg-accent px-4 text-sm text-accent-fg"
              >
                Browse apps
              </Link>
            }
          />
        ) : favoritesQuery.isPending ? (
          <AppGridSkeleton count={3} />
        ) : favoritesQuery.isError ? (
          <p role="alert" className="text-sm text-danger">
            {userFacingError(favoritesQuery.error)}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {favoriteApps.map((app) => (
              <AppCard key={app.id} app={app} />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="following-heading" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="following-heading" className="flex items-center gap-2 text-xl font-semibold">
            <Bell className="h-5 w-5" aria-hidden />
            Following
          </h2>
          {watchedApps.length > 0 ? (
            <Button variant="ghost" size="sm" onClick={watch.clear}>
              <Trash2 className="h-4 w-4" aria-hidden />
              Clear all
            </Button>
          ) : null}
        </div>

        <p className="text-sm text-muted">
          Follow an app to track new releases. Release notifications arrive when account sync ships.
        </p>

        {watch.ids.length === 0 ? (
          <EmptyState
            icon={<Bell className="h-6 w-6" aria-hidden />}
            title="You are not following any apps yet."
            description="Use the Follow button on an app page to track its releases here."
          />
        ) : watchQuery.isPending ? (
          <AppGridSkeleton count={3} />
        ) : (
          <ul className="space-y-2">
            {watchedApps.map((app) => (
              <li key={app.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line p-3">
                <Link href={`/apps/${app.slug}`} className="min-w-0 flex-1 font-medium hover:text-accent">
                  {app.name}
                </Link>
                <span className="text-sm text-fg-subtle">
                  {app.latest_release?.version ? `v${app.latest_release.version}` : "No release"}
                </span>
                <Button variant="ghost" size="sm" onClick={() => watch.remove(app.id)}>
                  Unfollow
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
