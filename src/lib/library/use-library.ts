"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

import {
  addToCollection,
  createCollection,
  ensureLoaded,
  getSnapshot,
  getSyncState,
  importCollection,
  isInList,
  removeFromCollection,
  removeCollection,
  restoreFromBackup,
  signIn,
  signOut,
  subscribe,
  toggleList,
} from "./store";
import { EMPTY_LIBRARY, type LibrarySnapshot, type ListKind } from "./types";
import type { SyncState } from "./sync";

/** Reactive personal library state (local-first, cloud-synced). */
export function useLibrary() {
  useEffect(() => {
    void ensureLoaded();
  }, []);

  const library = useSyncExternalStore<LibrarySnapshot>(
    subscribe,
    getSnapshot,
    () => EMPTY_LIBRARY,
  );
  const sync = useSyncExternalStore<SyncState>(subscribe, getSyncState, () =>
    getSyncState(),
  );

  const toggle = useCallback((kind: ListKind, appId: string) => toggleList(kind, appId), []);
  const has = useCallback((kind: ListKind, appId: string) => isInList(kind, appId), []);

  return {
    library,
    sync,
    toggle,
    has,
    createCollection,
    addToCollection,
    removeFromCollection,
    removeCollection,
    importCollection,
    restoreFromBackup,
    signIn,
    signOut,
  };
}
