/**
 * IndexedDB persistence for tracked sources.
 *
 * Deliberately a *separate* database from the personal library so the two
 * features can evolve (and be cleared) independently. Falls back to an
 * in-memory array when IndexedDB is unavailable, so the UI always works.
 */

import { openDB, type IDBPDatabase } from "idb";

import type { TrackedApp } from "./types";

const DB_NAME = "omnistore-tracks";
const DB_VERSION = 1;
const STORE = "apps";

let dbPromise: Promise<IDBPDatabase | null> | null = null;
let memory: TrackedApp[] = [];
let useMemory = false;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function getDb(): Promise<IDBPDatabase | null> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    useMemory = true;
    return Promise.resolve(null);
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "key" });
        }
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
  if (!db) return clone(memory);
  try {
    const rows = (await db.getAll(STORE)) as TrackedApp[];
    return rows ?? [];
  } catch {
    return clone(memory);
  }
}

export async function putTracked(app: TrackedApp): Promise<void> {
  const db = await getDb();
  if (!db) {
    const index = memory.findIndex((entry) => entry.key === app.key);
    if (index >= 0) memory[index] = app;
    else memory.push(app);
    return;
  }
  try {
    await db.put(STORE, app);
  } catch {
    const index = memory.findIndex((entry) => entry.key === app.key);
    if (index >= 0) memory[index] = app;
    else memory.push(app);
  }
}

export async function removeTracked(key: string): Promise<void> {
  const db = await getDb();
  memory = memory.filter((entry) => entry.key !== key);
  if (!db) return;
  try {
    await db.delete(STORE, key);
  } catch {
    /* best effort */
  }
}

/** Acknowledge the current version so it stops counting as an update. */
export async function markSeen(key: string, version: string | null): Promise<void> {
  const existing = (await listTracked()).find((entry) => entry.key === key);
  if (!existing) return;
  await putTracked({ ...existing, seenVersion: version, refreshedAt: new Date().toISOString() });
}

export async function replaceTracked(apps: TrackedApp[]): Promise<void> {
  const db = await getDb();
  memory = clone(apps);
  if (!db) return;
  try {
    const tx = db.transaction(STORE, "readwrite");
    await tx.objectStore(STORE).clear();
    for (const app of apps) void tx.objectStore(STORE).put(app);
    await tx.done;
  } catch {
    /* best effort */
  }
}

/** Exposed for tests: forget everything, including the open handle. */
export async function resetTrackedForTests(): Promise<void> {
  memory = [];
  useMemory = false;
  const db = await getDb();
  if (db) {
    try {
      await db.clear(STORE);
    } catch {
      /* ignore */
    }
  }
  dbPromise = null;
}

export function isMemoryFallback(): boolean {
  return useMemory;
}
