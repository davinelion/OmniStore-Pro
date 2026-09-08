import type { Collection } from "@/lib/schemas/omnisource";

/**
 * Collections are configuration-driven.
 *
 * `apps` holds curated app ids (resolved against live OmniSource data; unknown
 * ids are dropped rather than rendered as placeholders).
 * `rule` lets a collection be generated from catalog data instead — this is the
 * hook for OmniSource-generated collections later, with no UI change.
 */
export const COLLECTIONS: Collection[] = [
  {
    slug: "best-open-source-music-apps",
    name: "Best Open-Source Music Apps",
    description: "Players and libraries that keep your music under your control.",
    apps: [],
    rule: { platforms: [], categories: ["audio"], min_platforms: null, licenses: [], sort: "popularity", limit: 12 },
    curated: false,
  },
  {
    slug: "best-privacy-apps",
    name: "Best Privacy Apps",
    description: "Tools that default to local-first or encrypted workflows.",
    apps: [],
    rule: { platforms: [], categories: ["security"], min_platforms: null, licenses: [], sort: "trust", limit: 12 },
    curated: false,
  },
  {
    slug: "best-developer-tools",
    name: "Best Developer Tools",
    description: "Editors, clients and utilities for building software.",
    apps: [],
    rule: { platforms: [], categories: ["developer-tools"], min_platforms: null, licenses: [], sort: "popularity", limit: 12 },
    curated: false,
  },
  {
    slug: "best-cross-platform-apps",
    name: "Best Cross-Platform Apps",
    description: "One identity across phones and desktops — available on four or more platforms.",
    apps: [],
    rule: { platforms: [], categories: [], min_platforms: 4, licenses: [], sort: "trust", limit: 12 },
    curated: false,
  },
  {
    slug: "best-linux-apps",
    name: "Best Linux Apps",
    description: "Desktop software that treats Linux as a first-class platform.",
    apps: [],
    rule: { platforms: ["linux"], categories: [], min_platforms: null, licenses: [], sort: "popularity", limit: 12 },
    curated: false,
  },
  {
    slug: "best-android-apps",
    name: "Best Android Apps",
    description: "Open-source Android clients with validated packages.",
    apps: [],
    rule: { platforms: ["android"], categories: [], min_platforms: null, licenses: [], sort: "popularity", limit: 12 },
    curated: false,
  },
  {
    slug: "essential-system-tools",
    name: "Essential System Tools",
    description: "Backup, sync and monitoring utilities worth installing first.",
    apps: [],
    rule: { platforms: [], categories: ["system-tools", "utilities", "networking"], min_platforms: null, licenses: [], sort: "trust", limit: 12 },
    curated: false,
  },
  {
    slug: "privacy-respecting-browsers",
    name: "Privacy-Respecting Browsers",
    description: "Browsers you can audit yourself.",
    apps: [],
    rule: { platforms: [], categories: ["browsers", "internet"], min_platforms: null, licenses: [], sort: "popularity", limit: 12 },
    curated: false,
  },
];

export function getCollection(slug: string): Collection | undefined {
  return COLLECTIONS.find((c) => c.slug === slug);
}
