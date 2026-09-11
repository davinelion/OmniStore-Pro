/**
 * Personal library model. Local-first (IndexedDB), cloud-synced when the
 * visitor signs in. The cloud mirror attaches to a one-way subject
 * derivation — the email itself is never stored or sent.
 */

export type ListKind = "favorites" | "bookmarks" | "watchlist";

export const LIST_KINDS: readonly ListKind[] = ["favorites", "bookmarks", "watchlist"];

export interface UserCollection {
  id: string;
  name: string;
  description: string;
  /** App ids in display order. */
  appIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LibrarySnapshot {
  favorites: string[];
  bookmarks: string[];
  watchlist: string[];
  collections: UserCollection[];
}

export const EMPTY_LIBRARY: LibrarySnapshot = {
  favorites: [],
  bookmarks: [],
  watchlist: [],
  collections: [],
};

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
