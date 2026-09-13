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
  defaultTrackedSettings,
} from "./types";
import { listTracked, markSeen, putTracked, removeTracked, updateTrackedSettings, replaceTracked, getGlobalSettings, putGlobalSettings, type GlobalUpdateSettings } from "./store";

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

export function useTracked() {
  const [apps, setApps] = useState<TrackedApp[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [globalSettings, setGlobalSettings] = useState<GlobalUpdateSettings | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listTracked(), getGlobalSettings()])
      .then(([rows, settings]) => {
        if (!cancelled) {
          setApps(rows.sort(compareTracked));
          setGlobalSettings(settings);
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
    const defaults = defaultTrackedSettings();

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
      seenVersion: existing?.seenVersion ?? input.version,
      installedVersion: existing?.installedVersion ?? input.version,
      latestVersion: input.version,
      latestReleasedAt: input.releasedAt,
      addedAt: existing?.addedAt ?? now,
      refreshedAt: now,
      pending: input.pending,
      autoUpdate: existing?.autoUpdate ?? defaults.autoUpdate,
      includePrerelease: existing?.includePrerelease ?? defaults.includePrerelease,
      skippedVersion: existing?.skippedVersion ?? defaults.skippedVersion,
      trackOnly: existing?.trackOnly ?? defaults.trackOnly,
      allowDowngrade: existing?.allowDowngrade ?? defaults.allowDowngrade,
      wifiOnly: existing?.wifiOnly ?? defaults.wifiOnly,
      chargingOnly: existing?.chargingOnly ?? defaults.chargingOnly,
      versionFilter: existing?.versionFilter ?? defaults.versionFilter,
      lastNotifiedAt: existing?.lastNotifiedAt ?? defaults.lastNotifiedAt,
    };

    await putTracked(next);
    setApps((await listTracked()).sort(compareTracked));
    return next;
  }, []);

  const untrack = useCallback(async (key: string) => {
    await removeTracked(key);
    setApps((current) => current.filter((entry) => entry.key !== key));
  }, []);

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

      for (const entry of merged) await putTracked(entry);
      setApps(merged.sort(compareTracked));

      // Update global last check
      const settings = await getGlobalSettings();
      const updatedSettings = { ...settings, lastCheckAt: now };
      await putGlobalSettings(updatedSettings);
      setGlobalSettings(updatedSettings);

      // Notify if enabled and new updates found
      const newUpdates = merged.filter(hasUpdate);
      if (newUpdates.length > 0 && settings.notificationsEnabled && typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "granted") {
          try {
            new Notification(`OmniStore: ${newUpdates.length} update${newUpdates.length > 1 ? "s" : ""} available`, {
              body: newUpdates.slice(0, 3).map(u => `${u.name}: ${u.latestVersion}`).join(", "),
              icon: "/icon-192.png",
            });
          } catch {}
        }
      }

      return merged;
    } catch {
      setError("refresh-failed");
      setApps(current.sort(compareTracked));
      return current;
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

  const setInstalledVersion = useCallback(async (key: string, version: string) => {
    await updateTrackedSettings(key, { installedVersion: version, seenVersion: version });
    setApps((await listTracked()).sort(compareTracked));
  }, []);

  const skipVersion = useCallback(async (key: string, version: string | null) => {
    await updateTrackedSettings(key, { skippedVersion: version });
    setApps((await listTracked()).sort(compareTracked));
  }, []);

  const updateSettings = useCallback(async (key: string, patch: Partial<TrackedApp>) => {
    await updateTrackedSettings(key, patch);
    setApps((await listTracked()).sort(compareTracked));
  }, []);

  const updateGlobalSettings = useCallback(async (patch: Partial<GlobalUpdateSettings>) => {
    const current = await getGlobalSettings();
    const next = { ...current, ...patch };
    await putGlobalSettings(next);
    setGlobalSettings(next);
  }, []);

  const importApps = useCallback(async (imported: TrackedApp[]) => {
    const current = await listTracked();
    const byKey = new Map(current.map(a => [a.key, a]));
    for (const app of imported) {
      byKey.set(app.key, app);
    }
    const merged = Array.from(byKey.values());
    await replaceTracked(merged);
    setApps(merged.sort(compareTracked));
  }, []);

  const exportApps = useCallback(() => {
    return apps;
  }, [apps]);

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
    globalSettings,
    track,
    untrack,
    refresh,
    acknowledge,
    setInstalledVersion,
    skipVersion,
    updateSettings,
    updateGlobalSettings,
    importApps,
    exportApps,
    isTracked,
    hasUpdate,
  };
}
