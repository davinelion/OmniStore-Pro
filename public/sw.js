/*
 * OmniStore service worker.
 *
 * Caching strategy per resource class:
 *   - App shell      : precached, served when offline (navigations fall back to /offline)
 *   - Static assets  : cache-first (content-hashed by Next.js)
 *   - API responses  : stale-while-revalidate (short cache — catalog data is fresh data)
 *   - Everything else: network-first with cache fallback
 *
 * The whole catalog is explicitly NOT cached: OmniStore caches metadata the
 * user has already seen and says so rather than pretending to be offline-first.
 */

const VERSION = "v1.0.0";
const SHELL_CACHE = `omnistore-shell-${VERSION}`;
const STATIC_CACHE = `omnistore-static-${VERSION}`;
const API_CACHE = `omnistore-api-${VERSION}`;

const SHELL_ASSETS = [
  "/",
  "/offline",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
  "/icons/omnistore.svg",
];

const API_CACHE_MAX_ENTRIES = 60;

/* ------------------------------------------------------------------ */

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .catch(() => undefined) // A failed precache must not block installation.
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("omnistore-") && !key.endsWith(VERSION))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/* ------------------------------------------------------------------ */

function isStaticAsset(url) {
  return url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/");
}

function isApiRequest(url) {
  return url.pathname.startsWith("/api/v1/");
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  await Promise.all(keys.slice(0, keys.length - maxEntries).map((key) => cache.delete(key)));
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(API_CACHE);
  const cached = await cache.match(request);

  const network = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone()).then(() => trimCache(API_CACHE, API_CACHE_MAX_ENTRIES));
      }
      return response;
    })
    .catch(() => undefined);

  // Serve cached data immediately, refresh in the background.
  if (cached) {
    network.catch(() => undefined);
    return cached;
  }

  const fresh = await network;
  if (fresh) return fresh;

  return new Response(JSON.stringify({ error: { code: "offline", message: "Offline" } }), {
    status: 503,
    headers: { "content-type": "application/json" },
  });
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok) cache.put(request, response.clone());
  return response;
}

async function handleNavigation(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(request, response.clone());
      return response;
    }
    return response;
  } catch (error) {
    const cache = await caches.open(SHELL_CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;
    const offline = await cache.match("/offline");
    if (offline) return offline;
    return new Response("<h1>Offline</h1><p>OmniStore is unavailable offline.</p>", {
      status: 503,
      headers: { "content-type": "text/html" },
    });
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Next.js dev assets and RSC payloads are never cached.
  if (url.pathname.startsWith("/_next/webpack-hmr") || url.searchParams.has("_rsc")) return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (isApiRequest(url)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  event.respondWith(
    fetch(request).catch(async () => {
      const cache = await caches.open(SHELL_CACHE);
      return (await cache.match(request)) ?? (await cache.match("/offline")) ?? Response.error();
    }),
  );
});

/* Allow the page to trigger an update immediately. */
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
