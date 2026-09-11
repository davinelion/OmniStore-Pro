/**
 * Environment feature flags, exposed to clients through /api/v1/config.
 */

function envFlag(name: string, fallback: boolean) {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  return raw === "true" || raw === "1";
}

export const flags = {
  favorites: envFlag("FEATURE_FAVORITES", true),
  collections: envFlag("FEATURE_COLLECTIONS", true),
  userCollections: envFlag("FEATURE_USER_COLLECTIONS", true),
  cloudSync: envFlag("FEATURE_CLOUD_SYNC", true),
  pwa: envFlag("FEATURE_PWA", true),
  analytics: envFlag("NEXT_PUBLIC_ENABLE_ANALYTICS", false),
} as const;

export type FeatureFlags = typeof flags;

export const FLAG_KEYS = Object.keys(flags) as Array<keyof FeatureFlags>;
