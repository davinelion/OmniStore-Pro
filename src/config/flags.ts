export const flags = {
  comparison: process.env.FEATURE_COMPARISON !== "false",
  favorites: process.env.FEATURE_FAVORITES !== "false",
  collections: process.env.FEATURE_COLLECTIONS !== "false",
  reporting: process.env.FEATURE_REPORTING !== "false",
  pwa: process.env.FEATURE_PWA !== "false",
  aiRecommendations: process.env.FEATURE_AI_RECOMMENDATIONS === "true",
};
