# OmniStore architecture

OmniStore is a presentation client for OmniSource-Pro. Catalog records are never authored in React components.

```text
OmniSource-Pro API
        ↓
@omnistore/omnisource-sdk (typed methods + Zod response validation)
        ↓
src/lib/omnisource (Next.js cache tags, server adapter, proxy routes)
        ↓
React Query (client server-state and stale-time coordination)
        ↓
Next.js 15 App Router (RSC, streaming, ISR)
        ↓
accessible storefront UI
```

## Boundaries

- `packages/shared-models` owns the domain model and wire schemas.
- `packages/omnisource-sdk` is framework-neutral and exposes `getApps`,
  `getApp`, `getCategories`, `getTrending`, `getCollections`, `getStats`, and
  `getRecommendations`.
- `src/lib/omnisource` is the Next.js adapter. It adds cache tags, retry and
  timeout policy, route-level validation, and the same-origin `/api/v1` proxy.
- Server components call `getOmnisource()` directly. Interactive components use
  the same contract through the proxy and React Query's global provider.
- `data/omnisource-feed.json` is an ingest-produced, validated offline snapshot
  for local development only. Production deployments should set
  `OMNISOURCE_API_URL`; the UI has no mock records or hand-authored app data.

## Cache invalidation

Every upstream read carries tags such as `apps`, `app:{id}`, `collections`, and
`trending`. `POST /api/webhooks/omnisource` accepts an HMAC-signed OmniSource
update, revalidates those tags, and lets the next request refresh ISR content.

## Rendering and performance

- Catalog, detail, SEO, sitemap, and metadata routes are server-rendered.
- Search, favorites, theme, gallery, install hand-off, and the command palette
  are the only client-heavy surfaces.
- Next/Image is enabled with an explicit trusted-host allowlist.
- The PWA caches the shell and API reads with NetworkFirst semantics and uses
  `/offline` as the document fallback.
- Skeletons are available for streaming/loading boundaries and preserve layout.

## Data integrity

Upstream payloads are parsed with shared Zod schemas before mapping to domain
models. Missing values remain `null` or are rendered as unavailable; the client
never fabricates versions, security scans, downloads, or checksums.
