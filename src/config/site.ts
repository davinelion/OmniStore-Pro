/**
 * Site metadata + install-handoff guidance.
 *
 * There is deliberately NO category vocabulary, NO app data and NO collection
 * definitions here — every piece of catalog metadata comes from OmniSource at
 * runtime. Only presentation concerns live in this file.
 */

/**
 * Resolve the public site URL. `site.url` must ALWAYS be a valid absolute URL
 * — `layout.tsx` feeds it straight into `new URL(...)` (metadataBase) and
 * `absoluteUrl()` concatenates paths onto it. An empty or malformed
 * `NEXT_PUBLIC_SITE_URL` (e.g. an env var created without a value) must never
 * break the build, so anything unusable falls back to the dev default.
 */
function resolveSiteUrl(value: string | undefined): string {
  const candidate = (value ?? "").trim().replace(/\/+$/, "");
  if (!candidate) return "http://localhost:3000";
  try {
    new URL(candidate);
  } catch {
    return "http://localhost:3000";
  }
  return candidate;
}

const rawUrl = resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

function normaliseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

export const site = {
  name: "OmniStore",
  shortName: "OmniStore",
  tagline: "Every open-source app. One store.",
  title: "OmniStore — Universal open-source app discovery",
  description:
    "OmniStore is a universal discovery and distribution interface for open-source applications across iOS, iPadOS, Android, Windows, macOS and Linux, powered by OmniSource Pro.",
  url: normaliseUrl(rawUrl),
  version: process.env.NEXT_PUBLIC_OMNISTORE_VERSION ?? "1.0.0",
  /** Public OmniSource API base (browser-visible). Empty = same-origin proxy. */
  omnisourceUrl: normaliseUrl(process.env.NEXT_PUBLIC_OMNISOURCE_API_URL ?? ""),
  analyticsEnabled: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === "true",
  repoUrl: "https://github.com/iamsmmh/OmniStore-Pro",
  omnisourceRepoUrl: "https://github.com/iamsmmh/OmniSource-Pro",
} as const;

/** Absolute URL builder used by SEO, sitemaps and structured data. */
export function absoluteUrl(path = "/"): string {
  return `${site.url}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Installation guidance is presentation configuration, not catalog data: each
 * platform declares how a user completes an install after the hand-off to the
 * upstream release host. The web client can never install software.
 */
export const PLATFORM_HANDOFF: ReadonlyArray<{
  slug: string;
  name: string;
  icon: string;
  handoff: string;
}> = [
  {
    slug: "ios",
    name: "iOS",
    icon: "Smartphone",
    handoff:
      "OmniStore cannot install iOS apps from the browser. You will be taken to the upstream release, and installation is handled by your device.",
  },
  {
    slug: "ipados",
    name: "iPadOS",
    icon: "Tablet",
    handoff:
      "OmniStore cannot install iPadOS apps from the browser. You will be taken to the upstream release, and installation is handled by your device.",
  },
  {
    slug: "android",
    name: "Android",
    icon: "Smartphone",
    handoff:
      "After download, open the APK to install it. Your device handles installation and will ask for the relevant permission.",
  },
  {
    slug: "windows",
    name: "Windows",
    icon: "Monitor",
    handoff:
      "Run the installer after download. Windows SmartScreen and your antivirus still apply.",
  },
  {
    slug: "macos",
    name: "macOS",
    icon: "Laptop",
    handoff:
      "Open the disk image or package after download and drag the app to Applications. Gatekeeper still applies.",
  },
  {
    slug: "linux",
    name: "Linux",
    icon: "Terminal",
    handoff:
      "Make AppImages executable, or install DEB/RPM packages with your package manager. Your distribution handles installation.",
  },
];

export function platformHandoff(slug: string) {
  return PLATFORM_HANDOFF.find((p) => p.slug === slug);
}

export const SOCIAL_LINKS = [
  { label: "OmniStore on GitHub", href: site.repoUrl },
  { label: "OmniSource on GitHub", href: site.omnisourceRepoUrl },
] as const;
