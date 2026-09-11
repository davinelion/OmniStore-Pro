import type { App } from "./app";

/**
 * A collection is assembled inside OmniSource (editorial curation, user
 * collections, or generated sets) and consumed read-only by clients.
 */
export interface Collection {
  id: string;
  slug: string;
  name: string;
  description: string;
  isPublic: boolean;
  itemCount: number;
  createdAt: string | null;
  updatedAt: string | null;
  /** Present only on the collection detail response. */
  apps?: App[];
}

export type CollectionLayout = "hero" | "carousel" | "grid" | "list" | "compact";
