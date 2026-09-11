/**
 * Library store — single source of truth for the UI.
 *
 * subscribe/snapshot semantics work with React's useSyncExternalStore.
 * Mutations write through to IndexedDB and, when signed in, enqueue a
 * best-effort cloud sync (see ./sync).
 */

import { deleteCollection, loadLibrary, putCollection, replaceAll, setList, setMeta, getMeta } from "./db";
import { startSync, type SyncState } from "./sync";
import {
  EMPTY_LIBRARY,
  newId,
  type LibrarySnapshot,
  type ListKind,
  type UserCollection,
} from "./types";

type Listener = () => void;

let snapshot: LibrarySnapshot = EMPTY_LIBRARY;
let loaded = false;
let loadPromise: Promise<void> | null = null;
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): LibrarySnapshot {
  return snapshot;
}

export function getSyncState(): SyncState {
  return syncState;
}

let syncState: SyncState = { status: "local" };

function setSyncState(next: SyncState) {
  syncState = next;
  emit();
}

/** Ensure the snapshot is hydrated from IndexedDB (idempotent). */
export function ensureLoaded(): Promise<void> {
  if (loaded) return Promise.resolve();
  if (!loadPromise) {
    loadPromise = (async () => {
      const [local, email] = await Promise.all([loadLibrary(), getMeta<string>("email")]);
      snapshot = local;
      loaded = true;
      emit();
      if (email) {
        setSyncState({ status: "syncing" });
        const result = await startSync({
          local: snapshot,
          email,
          setLocal(next) {
            snapshot = next;
            emit();
          },
        });
        setSyncState(result);
      }
    })();
  }
  return loadPromise;
}

function toggleInList(kind: ListKind, appId: string): string[] {
  const current = snapshot[kind];
  return current.includes(appId) ? current.filter((id) => id !== appId) : [...current, appId];
}

function persistAndSync(next: LibrarySnapshot) {
  snapshot = next;
  emit();
  void persist(next);
}

async function persist(next: LibrarySnapshot) {
  await Promise.all([
    setList("favorites", next.favorites),
    setList("bookmarks", next.bookmarks),
    setList("watchlist", next.watchlist),
  ]);
  const email = await getMeta<string>("email");
  if (email) {
    setSyncState({ status: "syncing" });
    const result = await startSync({
      local: next,
      email,
      setLocal(d) {
        snapshot = d;
        emit();
      },
    });
    setSyncState(result);
  }
}

export function toggleList(kind: ListKind, appId: string): void {
  persistAndSync({ ...snapshot, [kind]: toggleInList(kind, appId) });
}

export function isInList(kind: ListKind, appId: string): boolean {
  return snapshot[kind].includes(appId);
}

export function createCollection(name: string, description = ""): UserCollection | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const collection: UserCollection = {
    id: newId(),
    name: trimmed.slice(0, 120),
    description: description.trim().slice(0, 500),
    appIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  snapshot = { ...snapshot, collections: [...snapshot.collections, collection] };
  emit();
  void putCollection(collection).then(() => void persist(snapshot));
  return collection;
}

export function addToCollection(collectionId: string, appId: string): void {
  const collections = snapshot.collections.map((collection) => {
    if (collection.id !== collectionId || collection.appIds.includes(appId)) return collection;
    const next = {
      ...collection,
      appIds: [...collection.appIds, appId],
      updatedAt: new Date().toISOString(),
    };
    void putCollection(next);
    return next;
  });
  persistAndSync({ ...snapshot, collections });
}

export function removeFromCollection(collectionId: string, appId: string): void {
  const collections = snapshot.collections.map((collection) => {
    if (collection.id !== collectionId || !collection.appIds.includes(appId)) return collection;
    const next = {
      ...collection,
      appIds: collection.appIds.filter((id) => id !== appId),
      updatedAt: new Date().toISOString(),
    };
    void putCollection(next);
    return next;
  });
  persistAndSync({ ...snapshot, collections });
}

export function removeCollection(collectionId: string): void {
  persistAndSync({
    ...snapshot,
    collections: snapshot.collections.filter((collection) => collection.id !== collectionId),
  });
  void deleteCollection(collectionId);
}

/** Import a shared collection (share-link or backup). Returns its id. */
export function importCollection(input: {
  name: string;
  description?: string;
  appIds: string[];
}): UserCollection {
  const collection: UserCollection = {
    id: newId(),
    name: input.name.slice(0, 120),
    description: (input.description ?? "").slice(0, 500),
    appIds: [...new Set(input.appIds)],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  snapshot = { ...snapshot, collections: [...snapshot.collections, collection] };
  emit();
  void putCollection(collection).then(() => void persist(snapshot));
  return collection;
}

/** Full restore from a backup file. */
export async function restoreFromBackup(next: LibrarySnapshot): Promise<void> {
  await replaceAll(next);
  snapshot = next;
  emit();
  void persist(next);
}

export async function signIn(email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) return false;
  const response = await fetch("/api/v1/me/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: normalized }),
  });
  if (!response.ok) return false;
  await setMeta("email", normalized);
  setSyncState({ status: "syncing" });
  const result = await startSync({
    local: snapshot,
    email: normalized,
    setLocal(next) {
      snapshot = next;
      emit();
    },
  });
  setSyncState(result);
  return true;
}

export async function signOut(): Promise<void> {
  await setMeta("email", null);
  setSyncState({ status: "local" });
  emit();
}
