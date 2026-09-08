import type { PlatformInfo } from "@/lib/schemas/omnisource";

const rawUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

function normaliseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

export const site = {
  name: "OmniStore",
  shortName: "OmniStore",
  tagline: "Discover open-source apps for every device.",
  title: "OmniStore — Universal open-source app discovery",
  description:
    "OmniStore is a universal discovery and distribution interface for open-source applications across iOS, iPadOS, Android, Windows, macOS and Linux, powered by OmniSource.",
  url: normaliseUrl(rawUrl),
  version: process.env.NEXT_PUBLIC_OMNISTORE_VERSION ?? "1.0.0",
  /** Base URL of a real OmniSource deployment. Empty = bundled OmniSource feed. */
  omnisourceUrl: normaliseUrl(process.env.NEXT_PUBLIC_OMNISOURCE_API_URL ?? ""),
  analyticsEnabled: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === "true",
  repoUrl: "https://github.com/iamsmmh/OmniStore-Pro",
  omnisourceRepoUrl: "https://github.com/iamsmmh/OmniSource-Pro",
  locale: "en",
} as const;

/** Absolute URL builder used by SEO, sitemaps and structured data. */
export function absoluteUrl(path = "/"): string {
  return `${site.url}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Initial taxonomy. Counts are computed from live OmniSource data at read time,
 * so this list is the vocabulary, not the data.
 */
export const CATEGORIES: ReadonlyArray<{ slug: string; name: string; description: string }> = [
  { slug: "audio", name: "Audio", description: "Players, streamers and audio production tools." },
  { slug: "video", name: "Video", description: "Playback, editing, recording and streaming." },
  { slug: "photography", name: "Photography", description: "Image editors, viewers and asset libraries." },
  { slug: "productivity", name: "Productivity", description: "Notes, tasks, documents and knowledge work." },
  { slug: "developer-tools", name: "Developer Tools", description: "Editors, clients, runtimes and build tooling." },
  { slug: "education", name: "Education", description: "Learning, reference and research tools." },
  { slug: "communication", name: "Communication", description: "Chat, mail and conferencing clients." },
  { slug: "social", name: "Social", description: "Federated and self-hosted social clients." },
  { slug: "internet", name: "Internet", description: "Browsers, downloads and networked utilities." },
  { slug: "browsers", name: "Browsers", description: "Web browsers and browsing utilities." },
  { slug: "security", name: "Security", description: "Vaults, encryption and privacy tooling." },
  { slug: "networking", name: "Networking", description: "Sync, transfer, VPN and network tooling." },
  { slug: "utilities", name: "Utilities", description: "Everyday tools that make a system usable." },
  { slug: "gaming", name: "Gaming", description: "Games, emulators and game tooling." },
  { slug: "books", name: "Books", description: "Readers, libraries and reference managers." },
  { slug: "finance", name: "Finance", description: "Accounting, budgeting and market tooling." },
  { slug: "science", name: "Science", description: "Research, data and scientific computing." },
  { slug: "system-tools", name: "System Tools", description: "Monitors, packages and system maintenance." },
  { slug: "ai", name: "AI", description: "Local and self-hosted machine learning tooling." },
];

export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug);

export function categoryName(slug: string): string {
  return CATEGORIES.find((c) => c.slug === slug)?.name ?? slug;
}

/**
 * Installation guidance is configuration, not inference: each platform declares
 * the package types it accepts and how a user completes installation.
 * The web client can never install software — it hands off to the OS.
 */
export const PLATFORM_INFO: ReadonlyArray<
  PlatformInfo & { icon: string; accent: string; installMethods: string[]; handoff: string }
> = [
  {
    slug: "ios",
    name: "iOS",
    description: "iPhone apps distributed as IPA packages or via upstream sources.",
    app_count: 0,
    install_methods: ["IPA", "Upstream source"],
    icon: "Smartphone",
    accent: "from-sky-500/20 to-sky-500/5",
    installMethods: ["IPA / supported source"],
    handoff:
      "OmniStore cannot install iOS apps from the browser. You will be taken to the upstream release, and installation is handled by your device.",
  },
  {
    slug: "ipados",
    name: "iPadOS",
    description: "iPad apps distributed as IPA packages or via upstream sources.",
    app_count: 0,
    install_methods: ["IPA", "Upstream source"],
    icon: "Tablet",
    accent: "from-sky-500/20 to-sky-500/5",
    installMethods: ["IPA / supported source"],
    handoff:
      "OmniStore cannot install iPadOS apps from the browser. You will be taken to the upstream release, and installation is handled by your device.",
  },
  {
    slug: "android",
    name: "Android",
    description: "Android apps distributed as APK or AAB packages.",
    app_count: 0,
    install_methods: ["APK", "AAB"],
    icon: "Smartphone",
    accent: "from-emerald-500/20 to-emerald-500/5",
    installMethods: ["APK"],
    handoff:
      "After download, open the APK to install it. Your device handles installation and will ask for the relevant permission.",
  },
  {
    slug: "windows",
    name: "Windows",
    description: "Windows desktop applications and installers.",
    app_count: 0,
    install_methods: ["EXE", "MSI", "MSIX", "Portable", "ZIP"],
    icon: "Monitor",
    accent: "from-blue-500/20 to-blue-500/5",
    installMethods: ["EXE / MSI / MSIX"],
    handoff:
      "Run the installer after download. Windows SmartScreen and your antivirus still apply.",
  },
  {
    slug: "macos",
    name: "macOS",
    description: "macOS applications distributed as disk images or packages.",
    app_count: 0,
    install_methods: ["DMG", "PKG", "ZIP"],
    icon: "Laptop",
    accent: "from-slate-400/20 to-slate-400/5",
    installMethods: ["DMG / PKG"],
    handoff:
      "Open the disk image or package after download and drag the app to Applications. Gatekeeper still applies.",
  },
  {
    slug: "linux",
    name: "Linux",
    description: "Linux packages across distributions and universal formats.",
    app_count: 0,
    install_methods: ["AppImage", "DEB", "RPM", "Flatpak", "Snap", "TAR"],
    icon: "Terminal",
    accent: "from-amber-500/20 to-amber-500/5",
    installMethods: ["AppImage / DEB / RPM / Flatpak"],
    handoff:
      "Make AppImages executable, or install DEB/RPM packages with your package manager. Your distribution handles installation.",
  },
];

export const PLATFORM_SLUGS = PLATFORM_INFO.map((p) => p.slug);

export function platformInfo(slug: string) {
  return PLATFORM_INFO.find((p) => p.slug === slug);
}

export const SOCIAL_LINKS = [
  { label: "OmniStore on GitHub", href: site.repoUrl },
  { label: "OmniSource on GitHub", href: site.omnisourceRepoUrl },
] as const;
