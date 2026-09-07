/** @type {import('next').NextConfig} */

/**
 * Build output directory.
 *
 * Overridable so a dev server started by the test suite cannot overwrite the
 * production build in `.next` (see tests/integration.test.ts).
 */
const distDir = process.env.NEXT_DIST_DIR ?? ".next";

const nextConfig = {
  reactStrictMode: true,
  distDir,
  poweredByHeader: false,
  images: { unoptimized: true },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // OmniStore is a public catalogue with no authenticated state, so it
          // stays embeddable by design (no X-Frame-Options / frame-ancestors).
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

export default nextConfig;
