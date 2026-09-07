/**
 * Configuration-driven feature flags.
 *
 * Server flags come from the environment (no NEXT_PUBLIC_ prefix needed because
 * this module is imported from server code and inlined at build time).
 * Client components receive flags through the /api/v1/config payload so that
 * experiments can be toggled without a rebuild of presentation code.
 */

function envFlag(name: string, fallback: boolean) {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  return raw === "true" || raw === "1";
}

export const flags = {
  comparison: envFlag("FEATURE_COMPARISON", true),
  favorites: envFlag("FEATURE_FAVORITES", true),
  collections: envFlag("FEATURE_COLLECTIONS", true),
  reporting: envFlag("FEATURE_REPORTING", true),
  pwa: envFlag("FEATURE_PWA", true),
  aiRecommendations: envFlag("FEATURE_AI_RECOMMENDATIONS", false),
  i18n: envFlag("FEATURE_I18N", true),
} as const;

export type FeatureFlags = typeof flags;

export const FLAG_KEYS = Object.keys(flags) as Array<keyof FeatureFlags>;
