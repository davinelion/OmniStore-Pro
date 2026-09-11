export interface Category {
  /** Slug identifier, e.g. "developer-tools". */
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string | null;
  appCount: number;
}

export interface PlatformInfo {
  id: string;
  slug: string;
  name: string;
  displayName: string;
  icon: string | null;
  appCount: number;
}
