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
        urlPattern: /\/api\/v1\/(apps|search|collections|categories|developers|trending|latest|stats|trust|security|platforms).*/,
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
  transpilePackages: ["@omnistore/shared-models"],
  images: {
    unoptimized: true,
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
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
