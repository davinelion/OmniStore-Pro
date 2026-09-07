export interface FavoritesStore {
  add(appId: string): void;
  remove(appId: string): void;
  has(appId: string): boolean;
  list(): string[];
}

const KEY = "omnistore:favorites";
const WATCH = "omnistore:watch";

function read(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]");
  } catch {
    return [];
  }
}

function write(key: string, ids: string[]) {
  localStorage.setItem(key, JSON.stringify(ids));
}

export const localFavorites: FavoritesStore = {
  add(id) {
    write(KEY, Array.from(new Set([...read(KEY), id])));
  },
  remove(id) {
    write(KEY, read(KEY).filter((x) => x !== id));
  },
  has(id) {
    return read(KEY).includes(id);
  },
  list() {
    return read(KEY);
  },
};

export const localWatch: FavoritesStore = {
  add(id) {
    write(WATCH, Array.from(new Set([...read(WATCH), id])));
  },
  remove(id) {
    write(WATCH, read(WATCH).filter((x) => x !== id));
  },
  has(id) {
    return read(WATCH).includes(id);
  },
  list() {
    return read(WATCH);
  },
};
