# OmniStore

Universal discovery and distribution interface for open-source applications.

OmniStore is a **client of OmniSource**: OmniSource supplies metadata, validation,
search and feeds; OmniStore presents them. This repository is the web client —
indexed, installable, accessible, and ready for native clients to reuse its
`/api/v1/*` contract.

---

## Advanced store guide

The [advanced store guide](docs/ADVANCED_STORE.md) covers the update inbox,
personal library with private notes and portable backups, shareable lists,
catalog transparency, RSS, reviewed metadata enrichment, contribution forms and
opt-in count-only telemetry — including setup, limits, and the external-service
work that remains. Requires **Node 22.12+**.

## Quick start

```bash
npm install
cp .env.example .env.local     # optional: every variable has a safe default
npm run dev                    # http://localhost:3000
```

The app works immediately: with no `OMNISOURCE_API_URL` configured it serves a
bundled, contract-valid demo catalog in-process (`src/lib/omnisource/bundled/`),
so every page renders with real open-source software out of the box. No
account, no database, no upstream service required.

### Go live against a real OmniSource

```bash
# .env.local
OMNISOURCE_API_URL=https://your-omnisource.example/api/v1   # server-side
```

Every page renders from OmniSource through this URL. Leaving it empty falls
back to the bundled catalog — swapping between the two is a configuration
change, not a rewrite.

---

## Architecture

```
Presentation   Next.js App Router pages + React components
               (server-rendered for crawlable pages, client components for
                search, favorites, theme, downloads)
      ↓
Application    src/lib/omnisource  ·  src/lib/platform  ·  src/lib/security
               API groups, filters, platform detection, URL hardening
      ↓
API client     OmniSourceClient (server)  ·  same-origin /api/v1/* (browser)
      ↓
OmniSource     bundled catalog (default) or a live deployment
               (OMNISOURCE_API_URL)
```

The UI never reads a database and never depends on OmniSource internals.
Swapping the bundled catalog for a live OmniSource is a configuration change,
not a rewrite. See [`docs/CLIENT_ARCHITECTURE.md`](docs/CLIENT_ARCHITECTURE.md)
for the full contract and the plan for native clients.

---

## Features

| Area | What works |
| --- | --- |
| Search | Full-text with typo tolerance, synonyms, ranked fields, facets, shareable URLs |
| Filters | Platform (any-of and all-of), category, licence, architecture, package type, open-source only, minimum trust/quality, freshness |
| Apps | Real upstream name, summary, description, features, licence, links, JSON-LD |
| Downloads | Platform-aware, validated assets only, size/architecture/checksum shown, install hand-off |
| Releases | Full history with sanitised notes, pre-release labels, versions and dates |
| Alternatives | Computed from shared categories and platforms — never hand-written |
| Comparison | Up to 4 apps, table view, shareable via URL |
| Taxonomy | Categories, platforms, developers, curated and rule-based collections |
| Tracking | Paste any source URL → track releases, update inbox, local-only |
| Personal | Favorites and follows, local-only, no account |
| PWA | Installable, offline shell, cached API responses |
| Theming | Light/dark/system, no flash, respects `prefers-reduced-motion` |
| i18n | English and Bangla, extensible message catalogues |
| Accessibility | Skip link, landmarks, labelled controls, keyboard paths, focus states |
| SEO | Canonical URLs, OG/Twitter cards, JSON-LD, sitemap.xml, robots.txt |

---

## Tracking sources

OmniStore can watch any upstream the way Obtanium does.

Paste a repository or package URL on [`/track`](/track) — `owner/name`,
`https://github.com/owner/name`, `git@host:owner/name.git`, or a
package-manager page. OmniStore resolves it against OmniSource and either:

- **finds it** → shows the app, its latest version and its platforms, and adds
  it to your tracked list; or
- **does not find it** → says so plainly, lets you track it as *awaiting
  indexing*, and offers to request it from OmniSource.

Tracked sources live in IndexedDB on your device — no account, no sync, no
upload. **Check for updates** re-reads every tracked app's current version from
OmniSource and diffs it against the version you last acknowledged, so the update
inbox only ever reports a version that actually changed. Unknown versions never
produce a false "update available".

| Route | Purpose |
| --- | --- |
| `GET /api/v1/sources/resolve?url=` | Resolve a pasted URL to a catalog app |
| `POST /api/v1/sources/refresh` | Current versions for tracked app ids |
| `POST /api/v1/sources/submit` | Forward an indexing request (server-only key) |

Supported upstreams: GitHub, GitLab, Codeberg, Forgejo, F-Droid, Flathub,
Winget and Homebrew — the same connectors OmniSource ships.

Indexing requests are only forwarded when `OMNISOURCE_SUBMIT_URL` is set. When
it is not, the UI offers a prefilled "Suggest an app" issue instead and never
claims a request was accepted.

---

## Environment

Copy `.env.example` to `.env.local`. Every variable is optional.

| Variable | Default | Purpose |
| --- | --- | --- |
| `OMNISOURCE_API_URL` | unset | Base URL of a live OmniSource deployment (server-side). Unset = bundled catalog |
| `NEXT_PUBLIC_OMNISOURCE_API_URL` | unset | Optional browser-visible base URL for direct client reads |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Absolute URLs for SEO and sitemap (auto-detected from Vercel env when unset) |
| `NEXT_PUBLIC_OMNISTORE_VERSION` | `1.0.0` | Version surfaced in `/api/v1/health` |
| `NEXT_PUBLIC_ENABLE_ANALYTICS` | `false` | Anonymous product analytics; off by default |
| `FEATURE_*` | see below | Feature flags: `FAVORITES`, `COLLECTIONS`, `USER_COLLECTIONS`, `CLOUD_SYNC`, `PWA` |
| `OMNISTORE_REPORT_WEBHOOK_URL` | unset | Optional `https://` webhook that receives reports (server-side only) |
| `OMNISOURCE_SUBMIT_URL` | unset | `https://` intake endpoint for source-indexing requests (server-side only) |
| `OMNISOURCE_ADMIN_API_KEY` | unset | API key sent to the intake endpoint (server-side only, never `NEXT_PUBLIC_`) |

**Never put a secret in a `NEXT_PUBLIC_*` variable** — they are shipped to the
browser.

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server on `0.0.0.0:3000` |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (Next + React hooks + a11y rules) |
| `npm test` | All unit + component tests (Vitest) |
| `npm run test:unit` | Unit + component tests only (`src/**`) |
| `npm run e2e` | Playwright end-to-end (needs `npm run e2e:install` once) |
| `npm run verify` | lint + typecheck + unit tests + build |

---

## Testing

- **Unit** — schemas/mappers, bundled catalog, source URL parsing, formatters,
  sectioning and library share/export helpers.
- **Component** — library tabs render and hydrate favorites from IndexedDB.
- **End-to-end** — Playwright specs (search, filters, app pages, downloads,
  favorites, theming, responsive, accessibility, 404s, offline) against the
  hermetic OmniSource mock (`scripts/mock-omnisource.mjs`).
  Browsers must be installed once: `npm run e2e:install`.

---

## Deployment

**Vercel**

1. Push this repository to GitHub and import it at https://vercel.com/new —
   the framework is detected automatically (`vercel.json` pins it to Next.js).
2. Build needs Node ≥ 22.12 (declared in `package.json#engines`, so Vercel
   picks the right runtime automatically).
3. **No environment variables are required.** With no `OMNISOURCE_API_URL`
   configured the app serves its bundled, contract-valid catalog in-process,
   so the storefront is fully populated on the very first deploy.
4. To go live against a real OmniSource backend, set `OMNISOURCE_API_URL`
   (and optionally `OMNISOURCE_API_KEY`) in the project's Environment
   Variables and redeploy.

Optional but recommended:

- `NEXT_PUBLIC_SITE_URL` — public origin for canonical URLs and `sitemap.xml`.
  When unset, Vercel's `VERCEL_PROJECT_PRODUCTION_URL` is used automatically.

Post-deploy checks:

```bash
curl -fsS "$SITE/api/v1/health"      # status should be "ok"
curl -fsS "$SITE/sitemap.xml" | head # should list /app/… URLs
```

**Netlify / any Node host**

```bash
npm ci && npm run build && npm start     # Node ≥ 22.12
```

Set `NEXT_PUBLIC_SITE_URL` to the public origin so canonical URLs and the
sitemap are correct.

**Docker**

```bash
docker build -t omnistore .
docker run -p 3000:3000 omnistore
```

**Static hosting** is not supported: search, feeds, sitemap, reporting and
caching are server-rendered by design.

**Post-deploy checks**

```bash
curl -fsS "$SITE/api/v1/health"      # status should be "ok"
curl -fsS "$SITE/sitemap.xml" | head # should list /apps/… URLs
```

---

## Honesty rules

These are product requirements, not preferences:

1. Nothing is invented. Missing upstream data renders as **Not available** —
   no fake descriptions, ratings, reviews, screenshots, versions or sizes.
2. Only `VALID` packages are offered as downloads. `INVALID`, `QUARANTINED` and
   `REVIEW_REQUIRED` are shown with their real status; `UNKNOWN` shows
   "Verification unavailable".
3. Verification is **not** a malware guarantee, and OmniStore never says it is.
   Scores are computed from public signals and always displayed with their
   contributing factors.
4. Only `https:` links leave the app. Release notes are sanitised before
   rendering; no upstream HTML, `javascript:`, iframes or inline handlers.
5. Binaries are not mirrored — downloads go to the upstream release host.

---

## Known limitations

- The bundled catalog is a **demo snapshot** (25 curated open-source apps) that
  ships in `src/lib/omnisource/bundled/` so the storefront works out of the box.
  Set `OMNISOURCE_API_URL` to a live deployment for the real, growing catalog.
- iPadOS coverage is thin because upstream projects rarely publish iPad-only
  artefacts; the platform is supported end-to-end and will populate as OmniSource does.
- A handful of upstream tag formats stay unnormalised on purpose (experimental
  nightlies, monorepo tags like `core@13.2.0`, commit-based builds): OmniStore
  shows the tag upstream published rather than inventing a version.
- Search is a high-quality in-process index over the current snapshot. It is not
  a distributed search engine; extremely large catalogs should move ranking into
  OmniSource behind the same contract.
- Favorites, follows and comparison selections are **device-local**. Account sync
  is designed for (see the store interface) but not implemented.
- End-to-end tests need Playwright browsers, which some sandboxes cannot download.

---

## Repository layout

```
src/app/**               routes: pages and /api/v1/* handlers
src/components/**        UI: app, search, collection, platform, layout, ui primitives
src/lib/omnisource/**    API groups, client, HTTP helpers — and bundled/ (demo catalog)
src/lib/security/        URL and markdown hardening
src/lib/platform/        OS detection and install-handoff helpers
src/config/**            site metadata and feature flags
src/i18n/**              locale config; messages/<locale>.json catalogues
packages/shared-models/  domain models, wire DTOs and Zod schemas (v1 contract)
public/                  icons, manifest, and the Open Graph image
scripts/mock-omnisource.mjs  hermetic OmniSource v1 mock for local/E2E use
docs/                    client architecture and API contract
e2e/                     Playwright acceptance tests
tests/                   test setup and shared suites
```
