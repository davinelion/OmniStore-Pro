"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  createLocalCollection,
  favoritesStore,
  recentlyViewedStore,
  watchStore,
  type LocalCollectionStore,
} from "@/lib/favorites/store";

/**
 * Subscribes a component to a local collection.
 *
 * `getServerSnapshot` returns an empty list so server and client markup match;
 * the real values appear after hydration.
 */
function useLocalCollection(store: LocalCollectionStore) {
  const ids = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    () => EMPTY,
  );

  const toggle = useCallback((id: string) => store.toggle(id), [store]);
  const add = useCallback((id: string) => store.add(id), [store]);
  const remove = useCallback((id: string) => store.remove(id), [store]);
  const clear = useCallback(() => store.clear(), [store]);

  return { ids, has: (id: string) => ids.includes(id), toggle, add, remove, clear };
}

const EMPTY: string[] = [];

export function useFavorites() {
  return useLocalCollection(favoritesStore);
}

export function useWatch() {
  return useLocalCollection(watchStore);
}

export function useRecentlyViewed() {
  return useLocalCollection(recentlyViewedStore);
}

/** Comparison selection is shareable, so it lives in the URL, not storage. */
export function useComparisonStoreKey() {
  return "omnistore:compare";
}

export { createLocalCollection };
