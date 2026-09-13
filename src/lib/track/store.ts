/**
 * IndexedDB persistence for tracked sources — now with Obtanium features.
 * Separate DB from personal library, memory fallback.
 */

import { openDB, type IDBPDatabase } from "idb";

import type { TrackedApp } from "./types";
import { defaultTrackedSettings } from "./types";

const DB_NAME = "omnistore-tracks";
const DB_VERSION = 2;
const STORE = "apps";
const SETTINGS_STORE = "settings";

let dbPromise: Promise<IDBPDatabase | null> | null = null;
let memory: TrackedApp[] = [];
let memorySettings: Record<string, any> = {};
let useMemory = false;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function migrateApp(app: any): TrackedApp {
  const defaults = defaultTrackedSettings();
  return {
    key: app.key,
    appId: app.appId ?? null,
    slug: app.slug ?? null,
    name: app.name,
    sourceUrl: app.sourceUrl,
    source: app.source,
    icon: app.icon ?? null,
    developer: app.developer,
    platforms: app.platforms ?? [],
    seenVersion: app.seenVersion ?? null,
    installedVersion: app.installedVersion ?? app.seenVersion ?? null,
    latestVersion: app.latestVersion ?? null,
    latestReleasedAt: app.latestReleasedAt ?? null,
    addedAt: app.addedAt,
    refreshedAt: app.refreshedAt ?? null,
    pending: !!app.pending,
    autoUpdate: app.autoUpdate ?? defaults.autoUpdate,
    includePrerelease: app.includePrerelease ?? defaults.includePrerelease,
    skippedVersion: app.skippedVersion ?? defaults.skippedVersion,
    trackOnly: app.trackOnly ?? defaults.trackOnly,
    allowDowngrade: app.allowDowngrade ?? defaults.allowDowngrade,
    wifiOnly: app.wifiOnly ?? defaults.wifiOnly,
    chargingOnly: app.chargingOnly ?? defaults.chargingOnly,
    versionFilter: app.versionFilter ?? defaults.versionFilter,
    lastNotifiedAt: app.lastNotifiedAt ?? defaults.lastNotifiedAt,
  };
}

function getDb(): Promise<IDBPDatabase | null> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    useMemory = true;
    return Promise.resolve(null);
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
          db.createObjectStore(SETTINGS_STORE, { keyPath: "id" });
        }
        // Migration: existing data will be migrated on read via migrateApp
      },
    }).catch(() => {
      useMemory = true;
      return null;
    });
  }
  return dbPromise;
}

export async function listTracked(): Promise<TrackedApp[]> {
  const db = await getDb();
  if (!db) return clone(memory).map(migrateApp);
  try {
    const rows = (await db.getAll(STORE)) as any[];
    return (rows ?? []).map(migrateApp);
  } catch {
    return clone(memory).map(migrateApp);
  }
}

export async function putTracked(app: TrackedApp): Promise<void> {
  const migrated = migrateApp(app);
  const db = await getDb();
  if (!db) {
    const index = memory.findIndex((entry) => entry.key === migrated.key);
    if (index >= 0) memory[index] = migrated;
    else memory.push(migrated);
    return;
  }
  try {
    await db.put(STORE, migrated);
  } catch {
    const index = memory.findIndex((entry) => entry.key === migrated.key);
    if (index >= 0) memory[index] = migrated;
    else memory.push(migrated);
  }
}

export async function removeTracked(key: string): Promise<void> {
  const db = await getDb();
  memory = memory.filter((entry) => entry.key !== key);
  if (!db) return;
  try {
    await db.delete(STORE, key);
  } catch {}
}

export async function markSeen(key: string, version: string | null): Promise<void> {
  const existing = (await listTracked()).find((entry) => entry.key === key);
  if (!existing) return;
  await putTracked({ 
    ...existing, 
    seenVersion: version, 
    installedVersion: version,
    refreshedAt: new Date().toISOString() 
  });
}

export async function updateTrackedSettings(key: string, patch: Partial<TrackedApp>): Promise<void> {
  const existing = (await listTracked()).find((entry) => entry.key === key);
  if (!existing) return;
  await putTracked({ ...existing, ...patch, refreshedAt: new Date().toISOString() });
}

export async function replaceTracked(apps: TrackedApp[]): Promise<void> {
  const migrated = apps.map(migrateApp);
  const db = await getDb();
  memory = clone(migrated);
  if (!db) return;
  try {
    const tx = db.transaction(STORE, "readwrite");
    await tx.objectStore(STORE).clear();
    for (const app of migrated) void tx.objectStore(STORE).put(app);
    await tx.done;
  } catch {}
}

export async function resetTrackedForTests(): Promise<void> {
  memory = [];
  memorySettings = {};
  useMemory = false;
  const db = await getDb();
  if (db) {
    try {
      await db.clear(STORE);
      if (db.objectStoreNames.contains(SETTINGS_STORE)) await db.clear(SETTINGS_STORE);
    } catch {}
  }
  dbPromise = null;
}

export function isMemoryFallback(): boolean {
  return useMemory;
}

// Global settings (Obtanium-style)
export interface GlobalUpdateSettings {
  id: string;
  checkIntervalHours: number;
  wifiOnly: boolean;
  chargingOnly: boolean;
  notificationsEnabled: boolean;
  autoUpdateAll: boolean;
  lastCheckAt: string | null;
}

const DEFAULT_GLOBAL: GlobalUpdateSettings = {
  id: "global",
  checkIntervalHours: 6,
  wifiOnly: false,
  chargingOnly: false,
  notificationsEnabled: true,
  autoUpdateAll: false,
  lastCheckAt: null,
};

export async function getGlobalSettings(): Promise<GlobalUpdateSettings> {
  const db = await getDb();
  if (!db) {
    return memorySettings["global"] ?? DEFAULT_GLOBAL;
  }
  try {
    const row = await db.get(SETTINGS_STORE, "global") as GlobalUpdateSettings | undefined;
    return row ?? DEFAULT_GLOBAL;
  } catch {
    return memorySettings["global"] ?? DEFAULT_GLOBAL;
  }
}

export async function putGlobalSettings(settings: GlobalUpdateSettings): Promise<void> {
  const db = await getDb();
  if (!db) {
    memorySettings["global"] = settings;
    return;
  }
  try {
    await db.put(SETTINGS_STORE, settings);
  } catch {
    memorySettings["global"] = settings;
  }
}
