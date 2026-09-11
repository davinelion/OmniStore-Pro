import type { AppSort, Platform, Architecture } from "./app";
import type { Paginated } from "../api/common";
import type { App } from "./app";

/** Filters accepted by GET /api/v1/search and GET /api/v1/apps. */
export interface SearchFilters {
  q?: string;
  platform?: Platform;
  category?: string;
  developer?: string;
  license?: string;
  architecture?: Architecture;
  openSource?: boolean;
  minTrust?: number;
  minQuality?: number;
  updatedSince?: string;
  sort?: AppSort;
  page?: number;
  perPage?: number;
}

/** A search result page. OmniSource owns ranking; clients only render it. */
export type SearchResponse = Paginated<App>;

export interface SearchSuggestion {
  text: string;
  kind: "app" | "developer" | "category" | "collection";
  id?: string;
}
