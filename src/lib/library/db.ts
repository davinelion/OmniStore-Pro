/**
 * IndexedDB persistence for the personal library (local mode).
 *
 * Degrades to an in-memory store when IndexedDB is unavailable (private
 * browsing, old browsers) so the UI always works.
 */

import { openDB, type IDBPDatabase } from "idb";
import {
  EMPTY_LIBRARY,
  newId,
  type LibrarySnapshot,
  type ListKind,
  type UserCollection,
} from "./types";

const DB_NAME = "omnistore-library";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase | null> | null = null;
const memory: LibrarySnapshot = structuredCloneFallback(EMPTY_LIBRARY);
let useMemory = false;

function structuredCloneFallback(value: LibrarySnapshot): LibrarySnapshot {
  return JSON.parse(JSON.stringify(value)) as LibrarySnapshot;
}

function getDb(): Promise<IDBPDatabase | null> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    useMemory = true;
    return Promise.resolve(null);
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("lists")) {
          db.createObjectStore("lists", { keyPath: "kind" });
        }
        if (!db.objectStoreNames.contains("collections")) {
          db.createObjectStore("collections", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta", { keyPath: "key" });
        }
      },
    }).catch(() => {
      useMemory = true;
      return null;
    });
  }
  return dbPromise;
}

export async function loadLibrary(): Promise<LibrarySnapshot> {
  const db = await getDb();
  if (!db) return structuredCloneFallback(memory);
  try {
    const [favorites, bookmarks, watchlist, collections] = await Promise.all([
      db.get("lists", "favorites"),
      db.get("lists", "bookmarks"),
      db.get("lists", "watchlist"),
      db.getAll("collections"),
    ]);
    return {
      favorites: favorites?.appIds ?? [],
      bookmarks: bookmarks?.appIds ?? [],
      watchlist: watchlist?.appIds ?? [],
      collections: (collections as UserCollection[]).sort((a, b) =>
        a.createdAt.localeCompare(b.createdAt),
      ),
    };
  } catch {
    return structuredCloneFallback(memory);
  }
}

export async function setList(kind: ListKind, appIds: string[]): Promise<void> {
  const db = await getDb();
  if (!db) {
    memory[kind] = appIds;
    return;
  }
  try {
    await db.put("lists", { kind, appIds });
  } catch {
    memory[kind] = appIds;
  }
}

export async function putCollection(collection: UserCollection): Promise<void> {
  const db = await getDb();
  if (!db) {
    const index = memory.collections.findIndex((c) => c.id === collection.id);
    if (index >= 0) memory.collections[index] = collection;
    else memory.collections.push(collection);
    return;
  }
  try {
    await db.put("collections", collection);
  } catch {
    /* best effort */
  }
}

export async function deleteCollection(id: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    memory.collections = memory.collections.filter((c) => c.id !== id);
    return;
  }
  try {
    await db.delete("collections", id);
  } catch {
    /* best effort */
  }
}

export async function replaceAll(snapshot: LibrarySnapshot): Promise<void> {
  const db = await getDb();
  if (!db) {
    Object.assign(memory, structuredCloneFallback(snapshot));
    return;
  }
  try {
    const tx = db.transaction(["lists", "collections"], "readwrite");
    for (const kind of ["favorites", "bookmarks", "watchlist"] as const) {
      void tx.objectStore("lists").put({ kind, appIds: snapshot[kind] });
    }
    await tx.objectStore("collections").clear();
    for (const collection of snapshot.collections) {
      void tx.objectStore("collections").put(collection);
    }
    await tx.done;
  } catch {
    Object.assign(memory, structuredCloneFallback(snapshot));
  }
}

/** Session metadata (sign-in email + last sync time). */
const memoryMeta = new Map<string, unknown>();

export async function getMeta<T = unknown>(key: string): Promise<T | null> {
  const db = await getDb();
  if (!db) return (memoryMeta.get(key) as T) ?? null;
  try {
    const row = await db.get("meta", key);
    return row?.value ?? null;
  } catch {
    return (memoryMeta.get(key) as T) ?? null;
  }
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  memoryMeta.set(key, value);
  const db = await getDb();
  if (!db) return;
  try {
    await db.put("meta", { key, value });
  } catch {
    /* best effort */
  }
}

export { newId };
