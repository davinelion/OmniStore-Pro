export const site = {
  name: "OmniStore",
  tagline: "Discover open-source apps for every device.",
  description:
    "OmniStore is a universal discovery and distribution interface for open-source applications across iOS, Android, Windows, macOS, and Linux.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  version: process.env.NEXT_PUBLIC_OMNISTORE_VERSION ?? "1.0.0",
  omnisourceUrl: process.env.NEXT_PUBLIC_OMNISOURCE_API_URL ?? "",
};

export const CATEGORIES = [
  { slug: "audio", name: "Audio" },
  { slug: "video", name: "Video" },
  { slug: "photography", name: "Photography" },
  { slug: "productivity", name: "Productivity" },
  { slug: "developer-tools", name: "Developer Tools" },
  { slug: "education", name: "Education" },
  { slug: "communication", name: "Communication" },
  { slug: "social", name: "Social" },
  { slug: "internet", name: "Internet" },
  { slug: "browsers", name: "Browsers" },
  { slug: "security", name: "Security" },
  { slug: "networking", name: "Networking" },
  { slug: "utilities", name: "Utilities" },
  { slug: "gaming", name: "Gaming" },
  { slug: "books", name: "Books" },
  { slug: "finance", name: "Finance" },
  { slug: "science", name: "Science" },
  { slug: "system-tools", name: "System Tools" },
  { slug: "ai", name: "AI" },
] as const;

export const PLATFORMS = [
  { slug: "ios", name: "iOS" },
  { slug: "ipados", name: "iPadOS" },
  { slug: "android", name: "Android" },
  { slug: "windows", name: "Windows" },
  { slug: "macos", name: "macOS" },
  { slug: "linux", name: "Linux" },
] as const;
