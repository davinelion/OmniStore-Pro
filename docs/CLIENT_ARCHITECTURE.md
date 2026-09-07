# OmniStore client architecture

How the OmniStore Web client is layered, and how a future iOS, Android,
Windows, macOS or Linux client reuses the same contract without the web UI
being rewritten.

Last updated: 2026-09-08 · Status: Web shipped, native clients designed but **not built**.

---

## 1. The one rule

> **Presentation code never talks to a database, and never depends on OmniSource
> internals.** It talks to `OmniSourceProvider` (server) or `/api/v1/*` (client).
> Everything else in this document follows from that.

OmniStore is a *client of OmniSource*. OmniSource owns ingestion, validation,
normalisation, search indexing, relationships and trust signals. OmniStore owns
presentation, navigation, local user state, downloads and installation hand-off.

---

## 2. Layers

```
┌──────────────────────────────────────────────────────────────────────┐
│ Presentation                                                          │
│   Next.js App Router pages + React components (src/app, src/components)│
│   Owns: layout, SEO, accessibility, empty/error/loading states         │
├──────────────────────────────────────────────────────────────────────┤
│ Application / Domain                                                  │
│   src/lib/search · src/lib/scores · src/lib/omnisource · src/lib/platform │
│   Owns: query parsing, ranking, filtering, sorting, install hand-off   │
├──────────────────────────────────────────────────────────────────────┤
│ API client                                                            │
│   src/lib/api/provider.ts (server)  ·  src/lib/api/client.ts (browser) │
│   Owns: the provider seam, Zod validation, error typing, caching       │
├──────────────────────────────────────────────────────────────────────┤
│ OmniSource                                                            │
│   Either the bundled feed (data/omnisource-feed.json, refreshed by      │
│   `npm run ingest`) or a live deployment (NEXT_PUBLIC_OMNISOURCE_API_URL)│
└──────────────────────────────────────────────────────────────────────┘
```

### 2.1 Presentation

Pages are **server components by default** so indexed pages (apps, categories,
platforms, developers, collections, trending, latest) ship real HTML for
crawlers and for users on slow devices. Client components are used only where
interaction demands it: `/search`, `/compare`, `/favorites`, theme and i18n
switching, the download panel and the filter sidebar.

Every page follows the same state contract — **loading, empty, error, partial,
offline** are designed states, never blank screens.

### 2.2 Application / domain

- `src/lib/search/query.ts` — the single search module: tokenising, ranking
  (name > summary > tags > category > description, with typo tolerance and
  synonyms), filtering, sorting, pagination, and URL serialisation.
  Filters live in the URL, so every view is shareable and back/forward works.
- `src/lib/scores/compute.ts` — derives Trust / Quality / Popularity from
  real upstream signals and emits the **factors** behind each number, so the UI
  can explain a score rather than assert it.
- `src/lib/omnisource/normalize.ts` — the OmniSource-side adapter: platform,
  architecture and package-type detection, artefact de-duplication, host
  allow-listing, version parsing. The UI *renders* these values; it never
  guesses them.
- `src/lib/platform/*` — install-method hints and best-effort platform
  detection for pre-selecting the right download.

### 2.3 API client

- **Server:** `getProvider()` returns the active `OmniSourceProvider`. With
  `NEXT_PUBLIC_OMNISOURCE_API_URL` unset it is `LocalProvider`, which validates
  the bundled feed **once** with Zod and throws on invalid data rather than
  rendering half-truths. With the variable set it is `HttpProvider`, which
  fails soft (returns `null` / empty) so a flaky upstream degrades the page
  instead of 500-ing it.
- **Browser:** `omniClient` talks to the app's own `/api/v1/*` routes, never
  directly to OmniSource. That keeps credentials, rate limiting and CORS on our
  side — and gives native clients the exact same endpoints to target.

---

## 3. The API contract (`/api/v1/*`)

Every response is JSON. Errors use a single envelope:

```json
{ "error": { "code": "not_found", "message": "App not found" } }
```

| Method | Endpoint | Purpose | Cache |
| --- | --- | --- | --- |
| GET | `/api/v1/apps` | Listing with filters, sort, pagination | 120 s shared |
| GET | `/api/v1/apps?ids=a,b` | Batch resolve (comparison), max 8 | no-store |
| GET | `/api/v1/apps/{id}` | One app by id or slug | 300 s |
| GET | `/api/v1/apps/{id}/releases` | Release history, newest first | 600 s |
| GET | `/api/v1/apps/{id}/alternatives` | Real alternative apps | 600 s |
| GET | `/api/v1/apps/{id}/similar` | Same-category neighbours | 600 s |
| GET | `/api/v1/search` | Ranked full-text search + facets | 60 s |
| GET | `/api/v1/categories` | Categories with app counts | 3600 s |
| GET | `/api/v1/platforms` | Platforms with counts and install hints | 3600 s |
| GET | `/api/v1/collections` | Curated and rule-based collections | 3600 s |
| GET | `/api/v1/collections/{slug}` | One collection, resolved apps | 3600 s |
| GET | `/api/v1/developers` | Developers with app counts | 3600 s |
| GET | `/api/v1/developers/{slug}` | Developer profile + apps | 3600 s |
| GET | `/api/v1/trending` | Popular, recently released, fast-moving | 300 s |
| GET | `/api/v1/latest` | Newest apps, updates, releases | 300 s |
| GET | `/api/v1/home` | Composed home payload | 300 s |
| GET | `/api/v1/stats` | Catalog counters | 600 s |
| GET | `/api/v1/licenses` | Licences in use, with counts | 3600 s |
| GET | `/api/v1/config` | Public feature flags and site config | 3600 s |
| POST | `/api/v1/reports` | Metadata issue reports | no-store, 5/min/IP |
| GET | `/api/v1/health` | Liveness + which provider is active | no-store |

### 3.1 Query parameters (search + apps)

| Key | Aliases | Meaning |
| --- | --- | --- |
| `q` | — | Full-text query (max 200 chars) |
| `platform` | `platforms` | Comma-separated, **any of** |
| `all` | `all_platforms` | Comma-separated, **all of** |
| `category` | `categories` | Comma-separated |
| `license` | `licenses` | SPDX ids |
| `arch` | `architectures` | `arm64`, `x86_64`, … |
| `pkg` | `package_types` | `APK`, `DMG`, `APPIMAGE`, … |
| `oss` | `open_source` | `true` / `false` |
| `trust` | `min_trust` | Minimum trust score (0–100) |
| `quality` | `min_quality` | Minimum quality score (0–100) |
| `updated` | `updated_within_days` | 7, 30, 90, 365 … |
| `sort` | — | `relevance`, `popularity`, `updated`, `released`, `newest`, `name`, `trust`, `quality` |
| `page`, `per_page` | — | Pagination (`per_page` ≤ 96) |

Unknown or hostile values are ignored or clamped — never echoed back into the
page.

### 3.2 Canonical shapes

`App`, `Release`, `Asset`, `Developer`, `License`, `Scores`, `Signals`,
`PlatformInfo`, `Category`, `Collection` are defined once, in
`src/lib/schemas/omnisource.ts`, as Zod schemas that double as the TypeScript
types. A native client should generate its models from this file (or from the
JSON Schema emitted by it) so both sides drift together.

Rules baked into the contract:

- **Only `https:` URLs** are representable. `javascript:`, `data:`, `file:`,
  `blob:` and `http:` are rejected by the schema itself.
- **Only `VALID` assets** may be presented as downloads. `INVALID`,
  `QUARANTINED` and `REVIEW_REQUIRED` are surfaced with their real status;
  `UNKNOWN` becomes "Verification unavailable".
- **Absent data is `null` or `[]`**, never a fabricated default. The UI renders
  "Not available".
- **Scores always carry their factors and a disclaimer.** A score is a signal,
  not a security guarantee and not a malware scan.

---

## 4. Adding a native client

Nothing in `src/lib/**` is web-specific except the React components. A native
client should:

1. **Consume `/api/v1/*`, not the feed file.** The bundled feed is a web
   deployment convenience; the HTTP contract is the product.
2. **Reuse the semantics, reimplement the rendering.** Ranking, filter
   semantics, sort keys and validation states must match the web client so a
   saved search behaves the same on every device.
3. **Port the schemas.** `src/lib/schemas/omnisource.ts` → Swift/Kotlin/C#/Rust
   models (or a shared JSON Schema). Validate on the edge of the client.
4. **Delegate installation, never fabricate it.** Web downloads open the
   upstream URL and hand off to the OS. Native clients should use the platform
   package manager or installer, driven by `package_type` and
   `platform.install_methods` — never by re-derived heuristics.
5. **Keep local-only state local.** Favorites, follows and comparison
   selections are device-local today. When account sync arrives, it replaces
   `src/lib/favorites/store.ts` with a remote implementation of the same
   interface; nothing else changes.

### 4.1 Client capability matrix

| Capability | Web | Future native clients |
| --- | --- | --- |
| Browse / search / filter | ✅ | Same endpoints, same semantics |
| App detail, releases, alternatives | ✅ | Same endpoints |
| Comparison | ✅ (max 4, URL + local storage) | Same cap recommended |
| Favorites / follows | ✅ (local storage) | Local store, later account sync |
| Downloads | Opens upstream `https:` URL; OS installs | Native installer or package manager |
| Offline | Service worker shell + cached API responses | Local cache of `/api/v1/*` |
| Theming | System + manual (next-themes) | System + manual |
| Reporting | `POST /api/v1/reports`, rate limited | Same endpoint, same schema |

### 4.2 What a native client must NOT do

- Do not hard-code OmniSource database fields, table names or internals.
- Do not render an unverified artefact as a download.
- Do not present a trust score as a safety guarantee.
- Do not invent missing metadata (icons, screenshots, ratings, reviews).

---

## 5. Data flow (today)

```
GitHub Releases API ──► scripts/ingest.ts ──► data/omnisource-feed.json
        (real upstream)        (validate,          (OmniSource-shaped)
                                normalise,
                                score)
                                                     │
                                                     ▼
                                          LocalProvider (Zod-validated)
                                                     │
                                     ┌───────────────┴───────────────┐
                                     ▼                               ▼
                        Server components (SSR)          /api/v1/* → omniClient
                                     │                               │
                                     └──────────► React UI ◄──────────┘
```

When a live OmniSource deployment exists, only the first box changes:

```
OmniSource API ──► HttpProvider ──► (identical downstream)
```

No page, component or hook changes.

---

## 6. Non-goals for this phase

- No native client binaries (iOS, Android, Windows, macOS, Linux).
- No account system, no server-side persistence of personal lists.
- No binary hosting or mirroring: OmniStore links to the upstream artefact.
- No malware scanning: verification means "served over HTTPS from an accepted
  upstream release host", nothing more.
