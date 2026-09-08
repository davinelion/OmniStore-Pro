"use client";

import { useCallback, useSyncExternalStore } from "react";
import { createLocalCollection } from "@/lib/favorites/store";
import { MAX_COMPARE } from "@/lib/compare";

export { MAX_COMPARE };

const comparisonStore = createLocalCollection("compare");

const EMPTY: string[] = [];

/**
 * Comparison selection.
 *
 * Stored locally like favorites, but also mirrored into the compare page URL
 * so a comparison can be shared.
 */
export function useComparison() {
  const ids = useSyncExternalStore(comparisonStore.subscribe, comparisonStore.getSnapshot, () => EMPTY);

  const toggle = useCallback((id: string) => {
    const has = comparisonStore.has(id);
    if (has) {
      comparisonStore.remove(id);
      return false;
    }
    if (comparisonStore.count() >= MAX_COMPARE) return false;
    comparisonStore.add(id);
    return true;
  }, []);

  const add = useCallback((id: string) => {
    if (comparisonStore.count() >= MAX_COMPARE || comparisonStore.has(id)) return false;
    comparisonStore.add(id);
    return true;
  }, []);

  const remove = useCallback((id: string) => comparisonStore.remove(id), []);
  const clear = useCallback(() => comparisonStore.clear(), []);

  return {
    ids,
    has: (id: string) => ids.includes(id),
    isFull: ids.length >= MAX_COMPARE,
    toggle,
    add,
    remove,
    clear,
  };
}

export { comparisonStore };
