/**
 * Trust model. Trust is *always* computed inside OmniSource — clients only
 * render the scores, factors and badges they receive.
 */

export type TrustBadge =
  | "verified"
  | "trusted"
  | "security_audited"
  | "community_verified"
  | "experimental"
  | "deprecated";

export const TRUST_BADGES: readonly TrustBadge[] = [
  "verified",
  "trusted",
  "security_audited",
  "community_verified",
  "experimental",
  "deprecated",
];

/** Transparent factor breakdown: factor name → contribution (0..1). */
export type TrustFactors = Record<string, number>;

export interface TrustReport {
  appId: string;
  score: number | null;
  factors: TrustFactors;
  badges: TrustBadge[];
  calculatedAt: string | null;
}
