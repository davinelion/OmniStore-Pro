# OmniStore

Universal discovery and distribution interface for open-source applications.

OmniStore is a **client of OmniSource**: OmniSource supplies metadata, validation,
search and feeds; OmniStore presents them. This repository is the web client —
indexed, installable, accessible, and ready for native clients to reuse its
`/api/v1/*` contract.

---

## Advanced store upgrade

New: [update inbox](/updates), personal library with private notes and portable
backups, shareable lists, editorial alternatives, catalog transparency, RSS,
reviewed metadata enrichment, contribution forms and opt-in count-only telemetry.
See [advanced store guide](docs/ADVANCED_STORE.md) for setup, limits, and the
external-service work that remains. Requires **Node 22.12+**.

## Quick start

```bash
npm install
cp .env.example .env.local     # optional: every variable has a safe default
npm run dev                    # http://localhost:3000
```

The app works immediately: a validated OmniSource-shaped feed ships in
`data/omnisource-feed.json`. No account, no database, no upstream service
required.

### Refresh the data from upstream

```bash
export GITHUB_TOKEN=ghp_...    # or rely on `gh auth login`
npm run ingest                 # re-fetch every source, re-score, rewrite the feed
```

`npm run ingest` reads `data/sources.json` (110 curated upstream repositories),
calls the GitHub repository and releases APIs, normalises platforms,
architectures and package types, computes scores from real signals, and writes a
feed that is validated against `src/lib/schemas/omnisource.ts` before it is
accepted. A partial run (expired credentials, network failure) refuses to
overwrite a good feed unless you pass `--force`.

Useful flags: `--only=owner/repo` re-ingests one source, `--out=path.json`
writes elsewhere.

---

## Architecture

```
Presentation   Next.js App Router pages + React components
               (server-rendered for crawlable pages, client components for
                search, compare, favorites, theme, downloads)
      ↓
Application    src/lib/search  ·  src/lib/scores  ·  src/lib/omnisource
               query parsing, ranking, filtering, signal-based scoring
      ↓
API client     getProvider()  (server)   ·   omniClient → /api/v1/* (browser)
      ↓
OmniSource     bundled feed (default) or a live deployment
               (NEXT_PUBLIC_OMNISOURCE_API_URL)
```

The UI never reads a database and never depends on OmniSource internals.
Swapping the bundled feed for a live OmniSource is a configuration change, not a
rewrite. See [`docs/CLIENT_ARCHITECTURE.md`](docs/CLIENT_ARCHITECTURE.md) for
the full contract and the plan for native clients.

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
| Personal | Favorites and follows, local-only, no account |
| PWA | Installable, offline shell, cached API responses |
| Theming | Light/dark/system, no flash, respects `prefers-reduced-motion` |
| i18n | English and Bangla, extensible message catalogues |
| Accessibility | Skip link, landmarks, labelled controls, keyboard paths, focus states |
| SEO | Canonical URLs, OG/Twitter cards, JSON-LD, sitemap.xml, robots.txt |

---

## Environment

Copy `.env.example` to `.env.local`. Every variable is optional.

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_OMNISOURCE_API_URL` | unset | Base URL of a live OmniSource deployment. Unset = bundled feed |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Absolute URLs for SEO and sitemap |
| `NEXT_PUBLIC_OMNISTORE_VERSION` | `1.0.0` | Version surfaced in `/api/v1/health` |
| `NEXT_PUBLIC_ENABLE_ANALYTICS` | `false` | Anonymous product analytics; off by default |
| `FEATURE_*` | see below | Feature flags: `COMPARISON`, `FAVORITES`, `COLLECTIONS`, `REPORTING`, `PWA`, `AI_RECOMMENDATIONS` |
| `OMNISTORE_REPORT_WEBHOOK_URL` | unset | Optional `https://` webhook that receives reports (server-side only) |
| `GITHUB_TOKEN` | unset | Used only by `npm run ingest`, never by the app |

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
| `npm test` | Unit, component, contract and integration tests |
| `npm run test:unit` | Unit + component tests only (`src/**`) |
| `npm run test:integration` | Server integration tests (`tests/**`) |
| `npm run e2e` | Playwright end-to-end (needs `npm run e2e:install` once) |
| `npm run ingest` | Refresh the OmniSource feed from upstream |
| `npm run verify` | lint + typecheck + unit tests + build |

---

## Testing

- **Unit** — schemas, search, scoring, URL safety, normalisation, formatters.
- **Component** — download panel (only validated assets become downloads),
  scores, cards, release history, search states, comparison hook.
- **Contract** — `/api/v1/*` shapes, status codes, error envelopes, pagination
  clamping, rate limiting, report validation.
- **Integration** — a real Next.js server: every page renders, filters work,
  JSON-LD is valid, no unsafe link scheme reaches the HTML, sitemap/robots/manifest/health are served.
- **Performance** — search and filter budgets over synthetic 2,000-app catalogs
  and the real feed.
- **End-to-end** — Playwright specs (search, filters, app pages, downloads,
  comparison, favorites, theming, responsive, accessibility, 404s, offline).
  Browsers must be installed once: `npm run e2e:install`.

---

## Deployment

**Vercel / Netlify / any Node host**

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

- The bundled feed is a **snapshot** (110 sources, refreshed by `npm run ingest`,
  which the included `Ingest` workflow can schedule weekly). Every page shows
  when the data was generated, and `/api/v1/health` reports it.
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
src/app/**            routes: pages and /api/v1/* handlers
src/components/**     UI: app, search, compare, platform, layout, ui primitives
src/lib/api/**        provider seam (local/http), browser client, HTTP helpers
src/lib/schemas/**    the OmniSource contract (Zod + TS types)
src/lib/omnisource/   OmniSource-side normalisation and artefact rules
src/lib/search/       query parsing, ranking, filtering, pagination
src/lib/scores/       signal-based scoring with factor transparency
src/lib/security/     URL and markdown hardening
src/config/**         site, flags, licences, collections
data/                 sources.json, the generated feed, the ingest report
scripts/ingest.ts     upstream → validated OmniSource-shaped feed
docs/                 client architecture and API contract
e2e/                  Playwright acceptance tests
tests/                integration and performance suites
```
