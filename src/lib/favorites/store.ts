/**
 * Local-first user state.
 *
 * Favorites and follows are deliberately local: browsing OmniStore must never
 * require an account. The abstraction is intentionally the one a future
 * account-syncing implementation would satisfy, so swapping in a remote store
 * later is a single module change.
 */

export interface FavoritesStore {
  add(appId: string): void;
  remove(appId: string): void;
  has(appId: string): boolean;
  list(): string[];
}

export interface LocalCollectionStore extends FavoritesStore {
  toggle(appId: string): boolean;
  clear(): void;
  count(): number;
  subscribe(listener: () => void): () => void;
  getSnapshot(): string[];
}

const STORAGE_PREFIX = "omnistore:";
const STORAGE_VERSION = "v1";

function storageKey(name: string) {
  return `${STORAGE_PREFIX}${name}:${STORAGE_VERSION}`;
}

const memoryFallback = new Map<string, string[]>();

function readRaw(key: string): string[] {
  if (typeof window === "undefined") return memoryFallback.get(key) ?? [];
  try {
    const value = window.localStorage.getItem(key);
    if (!value) return [];
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is string => typeof entry === "string");
  } catch {
    // Corrupt or unavailable storage must never break the page.
    return [];
  }
}

function writeRaw(key: string, ids: string[]) {
  if (typeof window === "undefined") {
    memoryFallback.set(key, ids);
    return;
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    memoryFallback.set(key, ids);
  }
}

/**
 * Creates a persisted id collection with change notifications so every
 * component stays in sync without prop drilling.
 */
export function createLocalCollection(name: string): LocalCollectionStore {
  const key = storageKey(name);
  let snapshot: string[] | null = null;
  const listeners = new Set<() => void>();

  const read = (): string[] => {
    if (snapshot === null) {
      snapshot = readRaw(key);
      if (typeof window !== "undefined") {
        // Keep other tabs consistent.
        window.addEventListener("storage", (event) => {
          if (event.key === key) {
            snapshot = readRaw(key);
            listeners.forEach((listener) => listener());
          }
        });
      }
    }
    return snapshot;
  };

  const write = (ids: string[]) => {
    snapshot = ids;
    writeRaw(key, ids);
    listeners.forEach((listener) => listener());
  };

  return {
    add(appId) {
      const ids = read();
      if (ids.includes(appId)) return;
      write([...ids, appId]);
    },
    remove(appId) {
      write(read().filter((id) => id !== appId));
    },
    has(appId) {
      return read().includes(appId);
    },
    list() {
      return [...read()];
    },
    toggle(appId) {
      const has = read().includes(appId);
      if (has) this.remove(appId);
      else this.add(appId);
      return !has;
    },
    clear() {
      write([]);
    },
    count() {
      return read().length;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot() {
      return read();
    },
  };
}

/** Favorites — "keep for later". */
export const favoritesStore = createLocalCollection("favorites");

/** Follows — "tell me about new releases" (notifications land in a later phase). */
export const watchStore = createLocalCollection("watch");

/** Recently viewed apps, used for the offline shell and quick back-navigation. */
export const recentlyViewedStore = createLocalCollection("recent");

export function rememberRecent(appId: string, limit = 12) {
  const current = recentlyViewedStore.list().filter((id) => id !== appId);
  const next = [appId, ...current].slice(0, limit);
  recentlyViewedStore.clear();
  next.forEach((id) => recentlyViewedStore.add(id));
}
