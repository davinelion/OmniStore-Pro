import type { App } from "./app";

export interface Developer {
  id: string;
  slug: string;
  name: string;
  url: string | null;
}

export interface DeveloperProfile extends Developer {
  /** Apps published by this developer, newest activity first. */
  apps: App[];
  platforms: string[];
  categories: string[];
  appCount: number;
}
