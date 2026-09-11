import type { App } from "./app";

/** Why OmniSource recommends an app. Reasons are always shown to the user. */
export type RecommendationKind =
  | "similar"
  | "alternative"
  | "collaborative"
  | "category"
  | "developer"
  | "trending"
  | "popular"
  | "new";

export interface RecommendationItem {
  app: App;
  kind: RecommendationKind;
  /** 0–1 affinity assigned by OmniSource's recommendation engine. */
  score: number;
  /** Human-readable explanations produced by the engine. */
  reasons: string[];
}

export interface RecommendationResponse {
  subjectAppId: string | null;
  algorithmVersion: string;
  generatedAt: string;
  items: RecommendationItem[];
}
