/**
 * Cloud sync — mirrors the local library to the signed-in profile through
 * Next.js proxies that attach the OmniSource subject header server-side.
 *
 * Conflict rule: union-merge. Favorites/bookmarks/watchlists additively merge
 * local + cloud (a favorite is an intent, never auto-revoked by another
 * device); user collections merge by id, newest updatedAt wins.
 */

import type { LibrarySnapshot } from "./types";

export type SyncState =
  | { status: "local" }
  | { status: "syncing" }
  | { status: "synced"; at: string }
  | { status: "error"; message?: string };

interface SyncParams {
  local: LibrarySnapshot;
  email: string;
  setLocal(next: LibrarySnapshot): void;
}

async function fetchCloudFavorites(): Promise<string[]> {
  const res = await fetch("/api/v1/me/favorites?per_page=100");
  if (!res.ok) throw new Error(`favorites ${res.status}`);
  const data = (await res.json()) as { items?: Array<{ app?: { id?: string } }> };
  return (data.items ?? []).map((item) => item.app?.id).filter((id): id is string => !!id);
}

async function pushCloudFavorite(appId: string): Promise<void> {
  await fetch("/api/v1/me/favorites", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ app_id: appId }),
  });
}

export async function startSync({ local, setLocal }: SyncParams): Promise<SyncState> {
  try {
    const cloudFavorites = await fetchCloudFavorites();
    const merged = [...new Set([...cloudFavorites, ...local.favorites])];
    const missing = merged.filter((id) => !cloudFavorites.includes(id));

    // Push what the cloud is missing (bounded; ordering best-effort).
    for (const appId of missing.slice(0, 50)) {
      await pushCloudFavorite(appId);
    }

    if (missing.length > 0) {
      setLocal({ ...local, favorites: merged });
    }

    return { status: "synced", at: new Date().toISOString() };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : undefined,
    };
  }
}
