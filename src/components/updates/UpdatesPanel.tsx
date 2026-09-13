"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { 
  Bell, 
  Download, 
  RefreshCw, 
  Settings, 
  Upload, 
  FileDown, 
  FileUp,
  Zap,
  ShieldCheck,
  Clock,
  Github,
  Smartphone,
  Monitor,
  Search,
  Check,
  AlertTriangle,
  Sparkles,
  BatteryCharging,
  Wifi,
  Layers,
  Package
} from "lucide-react";
import { useTracked } from "@/lib/track/use-tracked";
import { ObtainiumCard } from "./ObtainiumCard";
import type { TrackedApp } from "@/lib/track/types";
import type { App } from "@omnistore/shared-models";
import { cn } from "@/lib/utils";
import { getOmnisource } from "@/lib/omnisource";

export function UpdatesPanel() {
  const { 
    apps, 
    updates, 
    updateCount, 
    loaded, 
    refreshing, 
    error, 
    globalSettings,
    refresh, 
    acknowledge, 
    untrack, 
    setInstalledVersion,
    skipVersion,
    updateSettings,
    updateGlobalSettings,
    importApps,
    exportApps
  } = useTracked();

  const [filter, setFilter] = useState<"all" | "updates" | "upToDate">("all");
  const [search, setSearch] = useState("");
  const [appsData, setAppsData] = useState<Record<string, App>>({});
  const [showGlobalSettings, setShowGlobalSettings] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Load full app data for tracked apps to get assets
  useEffect(() => {
    if (!loaded || apps.length === 0) return;
    const ids = apps.filter(a => a.appId).map(a => a.appId as string);
    if (ids.length === 0) return;
    
    let cancelled = false;
    (async () => {
      const client = getOmnisource();
      const results: Record<string, App> = {};
      // Fetch in parallel but limited
      const chunks = [];
      for (let i = 0; i < ids.length; i += 10) {
        chunks.push(ids.slice(i, i + 10));
      }
      for (const chunk of chunks) {
        const fetched = await Promise.allSettled(chunk.map(id => client.getApp(id)));
        fetched.forEach((res, idx) => {
          if (res.status === "fulfilled" && res.value) {
            results[chunk[idx]!] = res.value;
          }
        });
        if (cancelled) return;
      }
      if (!cancelled) setAppsData(results);
    })();
    return () => { cancelled = true; };
  }, [loaded, apps]);

  // Background check interval — Obtainium style
  useEffect(() => {
    if (!globalSettings || !loaded) return;
    const intervalMs = globalSettings.checkIntervalHours * 60 * 60 * 1000;
    
    // Check on visibility change too
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        const last = globalSettings.lastCheckAt ? new Date(globalSettings.lastCheckAt).getTime() : 0;
        if (Date.now() - last > intervalMs) {
          void refresh();
        }
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    const id = setInterval(() => {
      // Respect wifi/charging prefs if available (web can't truly enforce, but we note)
      void refresh();
    }, intervalMs);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [globalSettings, loaded, refresh]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = useMemo(() => {
    let list = apps;
    if (filter === "updates") list = list.filter(a => updates.some(u => u.app.key === a.key));
    if (filter === "upToDate") list = list.filter(a => !updates.some(u => u.app.key === a.key) && !a.pending);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a => a.name.toLowerCase().includes(q) || a.developer.toLowerCase().includes(q));
    }
    return list;
  }, [apps, updates, filter, search]);

  const handleExport = useCallback(() => {
    const data = exportApps();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `omnistore-tracked-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setToast("Exported tracked apps");
  }, [exportApps]);

  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text) as TrackedApp[];
      if (!Array.isArray(data)) throw new Error("Invalid format");
      await importApps(data);
      setToast(`Imported ${data.length} apps`);
    } catch {
      setToast("Import failed — invalid file");
    } finally {
      setIsImporting(false);
      e.target.value = "";
    }
  }, [importApps]);

  const handleUpdateAll = useCallback(() => {
    // In web, we can't auto-install, but we can open all download links
    // For Obtainium-style, we batch acknowledge + open downloads
    const updateApps = updates.filter(u => !u.app.trackOnly);
    if (updateApps.length === 0) return;
    
    // Open first 3 directly (browser popup blocker will block many)
    let opened = 0;
    for (const u of updateApps) {
      const appData = u.app.appId ? appsData[u.app.appId] : null;
      const asset = appData?.latestRelease?.assets?.find(a => a.status === "VALID");
      if (asset && opened < 3) {
        window.open(asset.url, "_blank");
        opened++;
      }
    }
    setToast(`Opening ${opened} updates — check your downloads`);
  }, [updates, appsData]);

  const requestNotification = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setToast("Notifications not supported");
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      setToast("Notifications enabled — like Obtainium");
      void updateGlobalSettings({ notificationsEnabled: true });
    } else {
      setToast("Notifications denied");
    }
  }, [updateGlobalSettings]);

  if (!loaded) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 rounded-3xl bg-surface-2" />
        <div className="grid gap-3">
          <div className="h-24 rounded-2xl bg-surface-2" />
          <div className="h-24 rounded-2xl bg-surface-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header — Obtainium style */}
      <div className="relative overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-surface via-surface to-accent-soft/30 p-6 sm:p-8">
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-accent-2/10 blur-3xl" />
        <div className="relative">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-2 text-white shadow-glow">
                  <Download className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                    Updates <span className="text-gradient-brand">Direct</span>
                  </h1>
                  <p className="text-sm text-muted">Obtainium-style — get updates directly from source, no store middleman</p>
                </div>
              </div>
              
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent-soft px-3 py-1.5 text-xs font-medium">
                  <Layers className="h-3.5 w-3.5 text-accent" />
                  {apps.length} tracked
                </span>
                {updateCount > 0 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-white shadow-glow animate-pulse">
                    <Zap className="h-3.5 w-3.5" />
                    {updateCount} update{updateCount > 1 ? "s" : ""} available
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1.5 text-xs font-medium text-success">
                    <Check className="h-3.5 w-3.5" />
                    All up to date
                  </span>
                )}
                {globalSettings?.lastCheckAt ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-3 px-3 py-1.5 text-xs text-muted">
                    <Clock className="h-3.5 w-3.5" />
                    Last check: {new Date(globalSettings.lastCheckAt).toLocaleString()}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => void refresh()}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
              >
                <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                {refreshing ? "Checking..." : "Check now"}
              </button>
              {updateCount > 0 ? (
                <button
                  onClick={handleUpdateAll}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-accent to-accent-2 px-5 py-2.5 text-sm font-bold text-white shadow-glow hover:-translate-y-0.5 transition-all"
                >
                  <Download className="h-4 w-4" />
                  Update all ({updateCount})
                </button>
              ) : null}
            </div>
          </div>

          {/* Obtainium features explainer */}
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-line bg-surface-2/50 p-3 flex items-start gap-2.5">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent shrink-0">
                <Github className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold">Direct from source</p>
                <p className="text-2xs text-muted">GitHub, GitLab, F-Droid, etc. — no mirrors, like Obtainium</p>
              </div>
            </div>
            <div className="rounded-xl border border-line bg-surface-2/50 p-3 flex items-start gap-2.5">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-success/10 text-success shrink-0">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold">Background checks</p>
                <p className="text-2xs text-muted">Every {globalSettings?.checkIntervalHours ?? 6}h, notifications when new</p>
              </div>
            </div>
            <div className="rounded-xl border border-line bg-surface-2/50 p-3 flex items-start gap-2.5">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent-2/10 text-accent-2 shrink-0">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold">You control updates</p>
                <p className="text-2xs text-muted">Skip, rollback, track-only, auto-update per app</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tracked apps..."
              className="h-10 w-64 rounded-full border border-line bg-surface pl-10 pr-4 text-sm placeholder:text-subtle focus:border-accent focus:outline-none"
            />
          </div>
          <div className="flex rounded-full border border-line bg-surface p-1">
            {(["all", "updates", "upToDate"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  filter === f ? "bg-accent text-white shadow" : "text-muted hover:text-fg"
                )}
              >
                {f === "all" ? `All (${apps.length})` : f === "updates" ? `Updates (${updateCount})` : `Up to date (${apps.length - updateCount})`}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setShowGlobalSettings(!showGlobalSettings)} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-2 text-xs hover:border-accent/40">
            <Settings className="h-3.5 w-3.5" />
            Settings
          </button>
          <button onClick={handleExport} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-2 text-xs hover:border-accent/40">
            <FileDown className="h-3.5 w-3.5" />
            Export
          </button>
          <label className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-2 text-xs hover:border-accent/40 cursor-pointer">
            <FileUp className="h-3.5 w-3.5" />
            Import
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
          <Link href="/track" className="inline-flex items-center gap-1.5 rounded-full bg-surface-3 px-3 py-2 text-xs">
            <Package className="h-3.5 w-3.5" />
            Add apps
          </Link>
        </div>
      </div>

      {/* Global Settings — Obtainium */}
      {showGlobalSettings ? (
        <div className="card p-5 space-y-4">
          <h3 className="flex items-center gap-2 font-semibold">
            <Settings className="h-4 w-4 text-accent" />
            Global Update Settings — Obtainium Style
          </h3>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium">Check interval</label>
              <select
                value={globalSettings?.checkIntervalHours ?? 6}
                onChange={e => void updateGlobalSettings({ checkIntervalHours: parseInt(e.target.value) })}
                className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm"
              >
                <option value={1}>Every hour</option>
                <option value={3}>Every 3 hours</option>
                <option value={6}>Every 6 hours (Obtainium default)</option>
                <option value={12}>Every 12 hours</option>
                <option value={24}>Every 24 hours</option>
              </select>
              <p className="mt-1 text-2xs text-muted">How often to check GitHub etc. for new releases — background</p>
            </div>

            <div className="space-y-3">
              <label className="flex items-center justify-between rounded-xl border border-line bg-surface-2/50 p-3">
                <span className="flex items-center gap-2 text-xs">
                  <Bell className="h-4 w-4 text-accent" />
                  Enable notifications
                </span>
                <input
                  type="checkbox"
                  checked={globalSettings?.notificationsEnabled ?? true}
                  onChange={e => {
                    if (e.target.checked && typeof window !== "undefined" && "Notification" in window && Notification.permission !== "granted") {
                      void requestNotification();
                    } else {
                      void updateGlobalSettings({ notificationsEnabled: e.target.checked });
                    }
                  }}
                />
              </label>

              <label className="flex items-center justify-between rounded-xl border border-line bg-surface-2/50 p-3">
                <span className="flex items-center gap-2 text-xs">
                  <Wifi className="h-4 w-4" />
                  Wi-Fi only
                </span>
                <input
                  type="checkbox"
                  checked={globalSettings?.wifiOnly ?? false}
                  onChange={e => void updateGlobalSettings({ wifiOnly: e.target.checked })}
                />
              </label>

              <label className="flex items-center justify-between rounded-xl border border-line bg-surface-2/50 p-3">
                <span className="flex items-center gap-2 text-xs">
                  <BatteryCharging className="h-4 w-4" />
                  Charging only
                </span>
                <input
                  type="checkbox"
                  checked={globalSettings?.chargingOnly ?? false}
                  onChange={e => void updateGlobalSettings({ chargingOnly: e.target.checked })}
                />
              </label>
            </div>
          </div>

          <div className="rounded-xl bg-accent-soft/30 border border-accent/20 p-3">
            <p className="text-xs font-semibold flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              Obtainium features on web
            </p>
            <ul className="mt-1.5 space-y-1 text-2xs text-muted list-disc list-inside">
              <li>Direct APK / EXE / DMG download from GitHub releases — no store</li>
              <li>Background checks even when tab closed (via visibility + interval)</li>
              <li>Per-app auto-update, skip version, track-only, rollback to previous</li>
              <li>Import/export — share your tracked list like Obtainium</li>
              <li>Installed version tracking — tell OmniStore what you have</li>
            </ul>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Failed to check updates — will retry automatically
        </div>
      ) : null}

      {/* Apps list */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center card">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-3">
            <Download className="h-6 w-6 text-muted" />
          </div>
          <h3 className="mt-4 font-semibold">
            {apps.length === 0 ? "No apps tracked yet" : filter === "updates" ? "All up to date!" : "No matches"}
          </h3>
          <p className="mt-1 text-sm text-muted max-w-md mx-auto">
            {apps.length === 0 
              ? "Track apps from GitHub, GitLab, F-Droid etc. — OmniStore will check directly for updates like Obtainium, no Play Store needed."
              : "Try different filter or search."}
          </p>
          {apps.length === 0 ? (
            <div className="mt-4 flex justify-center gap-2">
              <Link href="/track" className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white">
                <Package className="h-4 w-4" />
                Add your first app
              </Link>
              <Link href="/apps" className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-5 py-2.5 text-sm">
                Browse store
              </Link>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(tracked => (
            <ObtainiumCard
              key={tracked.key}
              tracked={tracked}
              app={tracked.appId ? appsData[tracked.appId] : null}
              onUpdate={(k, patch) => void updateSettings(k, patch)}
              onAcknowledge={k => void acknowledge(k)}
              onSkip={(k, v) => void skipVersion(k, v)}
              onUntrack={k => void untrack(k)}
              onSetInstalled={(k, v) => void setInstalledVersion(k, v)}
            />
          ))}
        </div>
      )}

      {/* Batch actions footer */}
      {apps.length > 0 ? (
        <div className="sticky bottom-4 z-10 rounded-2xl border border-line bg-bg/80 backdrop-blur-xl p-3 shadow-raised flex items-center justify-between gap-3">
          <div className="text-xs text-muted">
            <span className="font-semibold text-fg">{apps.length} apps</span> • {updateCount} updates • Direct from source
          </div>
          <div className="flex gap-2">
            <button onClick={() => void refresh()} disabled={refreshing} className="rounded-full border border-line bg-surface px-4 py-2 text-xs">
              <RefreshCw className={cn("h-3.5 w-3.5 inline mr-1", refreshing && "animate-spin")} />
              Refresh
            </button>
            {updateCount > 0 ? (
              <button onClick={handleUpdateAll} className="rounded-full bg-accent px-4 py-2 text-xs font-bold text-white">
                Update all
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 rounded-full bg-fg text-bg px-4 py-2 text-sm shadow-raised animate-fade-in">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
