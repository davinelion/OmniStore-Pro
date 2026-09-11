"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { Platform } from "@omnistore/shared-models";
import type { SourceId } from "@/lib/sources";
import {
  compareTracked,
  hasUpdate,
  updateFor,
  type TrackedApp,
  type TrackedUpdate,
} from "./types";
import { listTracked, markSeen, putTracked, removeTracked } from "./store";

export interface TrackInput {
  appId: string | null;
  slug: string | null;
  name: string;
  sourceUrl: string;
  source: SourceId;
  icon: string | null;
  developer: string;
  platforms: Platform[];
  version: string | null;
  releasedAt: string | null;
  pending: boolean;
}

function keyFor(input: TrackInput): string {
  return input.appId ?? input.sourceUrl;
}

/**
 * Client state for tracked sources.
 *
 * Reads are local-first (IndexedDB) and refresh against OmniSource through
 * `/api/v1/sources/refresh`, which is the only place version diffing happens.
 */
export function useTracked() {
  const [apps, setApps] = useState<TrackedApp[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listTracked()
      .then((rows) => {
        if (!cancelled) {
          setApps(rows.sort(compareTracked));
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const track = useCallback(async (input: TrackInput) => {
    const key = keyFor(input);
    const now = new Date().toISOString();
    const existing = (await listTracked()).find((entry) => entry.key === key);

    const next: TrackedApp = {
      key,
      appId: input.appId,
      slug: input.slug,
      name: input.name,
      sourceUrl: input.sourceUrl,
      source: input.source,
      icon: input.icon,
      developer: input.developer,
      platforms: input.platforms,
      // Tracking a release is an implicit acknowledgement of it.
      seenVersion: existing?.seenVersion ?? input.version,
      latestVersion: input.version,
      latestReleasedAt: input.releasedAt,
      addedAt: existing?.addedAt ?? now,
      refreshedAt: now,
      pending: input.pending,
    };

    await putTracked(next);
    setApps((await listTracked()).sort(compareTracked));
    return next;
  }, []);

  const untrack = useCallback(async (key: string) => {
    await removeTracked(key);
    setApps((current) => current.filter((entry) => entry.key !== key));
  }, []);

  /** Re-read current versions from OmniSource and diff them. */
  const refresh = useCallback(async () => {
    const current = await listTracked();
    const ids = current.filter((entry) => entry.appId).map((entry) => entry.appId as string);
    if (ids.length === 0) {
      setApps(current.sort(compareTracked));
      return;
    }

    setRefreshing(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/sources/refresh", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!response.ok) throw new Error(`refresh failed (${response.status})`);

      const body = (await response.json()) as {
        items?: Array<{ appId: string; version: string | null; releasedAt: string | null }>;
      };
      const byId = new Map((body.items ?? []).map((item) => [item.appId, item]));

      const now = new Date().toISOString();
      const merged = current.map((entry) => {
        if (!entry.appId) return entry;
        const fresh = byId.get(entry.appId);
        if (!fresh) return entry;
        return {
          ...entry,
          latestVersion: fresh.version,
          latestReleasedAt: fresh.releasedAt,
          refreshedAt: now,
        };
      });

      // Persist the refreshed snapshot so the badge survives a reload.
      for (const entry of merged) await putTracked(entry);
      setApps(merged.sort(compareTracked));
    } catch {
      setError("refresh-failed");
      setApps(current.sort(compareTracked));
    } finally {
      setRefreshing(false);
    }
  }, []);

  const acknowledge = useCallback(async (key: string) => {
    const entry = (await listTracked()).find((item) => item.key === key);
    if (!entry) return;
    await markSeen(key, entry.latestVersion);
    setApps((await listTracked()).sort(compareTracked));
  }, []);

  const updates = useMemo<TrackedUpdate[]>(
    () => apps.map(updateFor).filter((value): value is TrackedUpdate => value !== null),
    [apps],
  );

  const updateCount = updates.length;

  const isTracked = useCallback(
    (appId: string | null, sourceUrl?: string) => {
      if (!appId && !sourceUrl) return false;
      return apps.some((entry) => entry.appId === appId || (sourceUrl && entry.sourceUrl === sourceUrl));
    },
    [apps],
  );

  return {
    apps,
    updates,
    updateCount,
    loaded,
    refreshing,
    error,
    track,
    untrack,
    refresh,
    acknowledge,
    isTracked,
    hasUpdate,
  };
}
