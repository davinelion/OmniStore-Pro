import createNextIntlPlugin from "next-intl/plugin";
import withPWA from "@ducanh2912/next-pwa";

/** @type {import('next').NextConfig} */

/**
 * Build output directory.
 *
 * Overridable so a dev server started by the test suite cannot overwrite the
 * production build in `.next` (see tests/integration.test.ts).
 */
const distDir = process.env.NEXT_DIST_DIR ?? ".next";

const withIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** Absolute path of the bundled catalog, for the webpack alias below. */
const feedFile = new URL("./data/omnisource-feed.json", import.meta.url).pathname;

/** PWA caching (Phase 14): icons, screenshots, API responses, shells. */
const withNextPwa = withPWA({
  dest: "public",
  register: false, // registered explicitly in components/layout/Pwa.tsx
  disable: process.env.NODE_ENV === "development",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  fallbacks: {
    document: "/offline",
  },
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      {
        // OmniStore API responses (proxied OmniSource data)
        urlPattern: /\/api\/v1\/(apps|search|collections|categories|developers|trending|latest|stats|trust|security|platforms|recommendations).*/,
        handler: "NetworkFirst",
        options: {
          cacheName: "omnistore-api",
          networkTimeoutSeconds: 4,
          expiration: { maxEntries: 300, maxAgeSeconds: 86_400 },
          backgroundSync: { name: "omnistore-api-queue" },
        },
      },
      {
        // Upstream icons & screenshots
        urlPattern: /\.(?:png|jpg|jpeg|webp|avif|svg|gif|ico)$/i,
        handler: "CacheFirst",
        options: {
          cacheName: "omnistore-media",
          expiration: { maxEntries: 600, maxAgeSeconds: 30 * 86_400 },
          rangeRequests: true,
        },
      },
    ],
  },
});

const nextConfig = {
  reactStrictMode: true,
  distDir,
  poweredByHeader: false,
  transpilePackages: ["@omnistore/shared-models", "@omnistore/omnisource-sdk"],
  images: {
    // Keep image optimization enabled. The allowlist prevents OmniSource data
    // from turning Next/Image into an open remote-image proxy.
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      "avatars.githubusercontent.com",
      "github.com",
      "raw.githubusercontent.com",
      "objects.githubusercontent.com",
      "user-images.githubusercontent.com",
      ...(process.env.NEXT_PUBLIC_OMNISOURCE_IMAGE_HOSTS ?? "")
        .split(",")
        .map((hostname) => hostname.trim())
        .filter(Boolean),
    ].map((hostname) => ({ protocol: "https", hostname })),
  },
  webpack: (config, { nextRuntime }) => {
    /**
     * Keep the 13 MB bundled catalog out of the browser and edge builds.
     *
     * `src/lib/omnisource/index.ts` is imported by client components (the
     * command palette and search box), so webpack also builds a chunk for the
     * feed provider's dynamic `import()` of the catalog JSON. Nothing in a
     * browser can ever execute that path — `FeedBackedClient` is constructed
     * only when `typeof window === "undefined"` — but without this alias the
     * chunk is still emitted to `/_next/static/` and deployed: ~8.9 MB of dead
     * weight that is publicly fetchable by anyone who guesses the URL.
     *
     * Aliasing the file to `false` in every non-Node compilation resolves it to
     * an empty module instead, so no catalog chunk is produced. Browsers always
     * read the catalog through the same-origin `/api/v1` proxy.
     */
    if (nextRuntime !== "nodejs") {
      config.resolve.alias = { ...config.resolve.alias, [feedFile]: false };
    }
    return config;
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // OmniStore is a public catalogue; it stays embeddable by design
          // (no X-Frame-Options / frame-ancestors).
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
    ];
  },
};

export default withIntl(withNextPwa(nextConfig));
