# OmniStore

Universal discovery and distribution interface for open-source applications.

OmniStore is a **client of OmniSource**: OmniSource supplies metadata, validation,
search and feeds; OmniStore presents them. This repository is the web client —
indexed, installable, accessible, and ready for native clients to reuse its
`/api/v1/*` contract.

---

## What's included

A device-local personal library with private notes and portable backups,
shareable lists, editorial alternatives, catalog transparency, contribution
forms, and opt-in count-only telemetry. See the
[advanced store guide](docs/ADVANCED_STORE.md) for setup and limits. Requires
**Node 22.12+**.

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

`npm run ingest` reads `data/sources.json` (a curated list of upstream
repositories), calls the GitHub repository and releases APIs, normalises
platforms, architectures and package types from the **real release assets** each
project publishes, derives trust / quality / popularity scores from public
signals, and writes a feed validated against the shared zod schemas in
`packages/shared-models` before it is accepted. A partial run (expired
credentials, network failure, a high 404 rate) refuses to overwrite a good feed
unless you pass `--force`.

The committed `data/omnisource-feed.json` currently holds **444 apps, 1,891
releases and 13,357 validated assets**.

Useful flags: `--only=owner/repo` re-ingests one source, `--limit=N` smoke-tests
the first N, `--out=path.json` writes elsewhere, `--concurrency=N` tunes
parallelism. `npm run ingest:check` runs a 12-source dry run to `/tmp`.

GitHub renames repositories often, and the API silently follows those redirects.
The ingest reports the effective repository in its `ingest.failures` report, so a
source that quietly became something else is visible rather than assumed good.

---

## Architecture

```
Presentation   Next.js App Router pages + React components
               (server-rendered for crawlable pages, client components for
                search, favorites, theme, downloads)
      ↓
SDK            getOmnisource() → OmniSourceClient
               AppsApi · SearchApi · CollectionsApi · DevelopersApi
               RecommendationsApi · CategoriesApi · TrustApi · SecurityApi
      ↓
Transport      server: OmniSourceClient (HTTP) or FeedBackedClient (in-process)
               browser: always the same-origin /api/v1 proxy
      ↓
OmniSource     1. a live deployment, when OMNISOURCE_API_URL is set
               2. the bundled feed in data/omnisource-feed.json (default)
```

Both data paths implement the identical OmniSource v1 contract, so nothing above
the transport knows which one answered. Every response is validated with the
shared zod schemas in `packages/shared-models` before it reaches a component —
malformed data degrades, it never crashes a page.

**Data source selection** is deliberate:

- `OMNISOURCE_API_URL` set → a live OmniSource deployment answers. This is the
  intended production wiring.
- Nothing set → `FeedBackedClient` serves `data/omnisource-feed.json`
  in-process. A fresh clone or a bare Vercel deploy renders a complete store with
  zero configuration instead of an empty shell.

The feed is loaded only in the Node.js runtime and only through a dynamic import
(see the comment in `next.config.mjs`), so the ~12 MB catalog never enters the
browser or edge bundles — browsers always read through `/api/v1`.

**Degradation:** every catalog read on a server-rendered page goes through
`orFallback` / `Promise.allSettled`. If a read fails the section renders empty
and the reason is logged with its route context; the route still returns 200
rather than 500.

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
| `NEXT_PUBLIC_OMNISOURCE_API_URL` | unset | Base URL of a live OmniSource deployment. Unset = bundled feed |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Absolute URLs for SEO and sitemap |
| `NEXT_PUBLIC_OMNISTORE_VERSION` | `1.0.0` | Version surfaced in `/api/v1/health` |
| `NEXT_PUBLIC_ENABLE_ANALYTICS` | `false` | Anonymous product analytics; off by default |
| `FEATURE_*` | see below | Feature flags: `COMPARISON`, `FAVORITES`, `COLLECTIONS`, `REPORTING`, `PWA`, `AI_RECOMMENDATIONS` |
| `OMNISTORE_REPORT_WEBHOOK_URL` | unset | Optional `https://` webhook that receives reports (server-side only) |
| `OMNISOURCE_SUBMIT_URL` | unset | `https://` intake endpoint for source-indexing requests (server-side only) |
| `OMNISOURCE_ADMIN_API_KEY` | unset | API key sent to the intake endpoint (server-side only, never `NEXT_PUBLIC_`) |
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
| `npm run e2e` | Playwright end-to-end (needs `npm run e2e:install` once) |
| `npm run ingest` | Refresh the bundled OmniSource feed from upstream |
| `npm run ingest:check` | 12-source dry run to `/tmp` — smoke-test ingest changes |
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

- The bundled feed is a **snapshot** (444 sources, refreshed by `npm run ingest`;
  there is no scheduled workflow in this repository yet, so refresh it manually
  or add one). Every page shows when the data was generated, and
  `/api/v1/health` reports it.
- iPadOS coverage is thin because upstream projects rarely publish iPad-only
  artefacts; the platform is supported end-to-end and will populate as OmniSource does.
- Version strings are normalised for display (a leading `v`, `release-` prefixes
  and scoped package names are reduced to the version) but a handful of upstream
  tag formats stay as published on purpose — experimental nightlies and
  commit-based builds show the tag upstream published rather than an invented
  version.
- Platform and package metadata comes from **GitHub release assets**. Projects
  that distribute only through their own download infrastructure (Blender,
  Inkscape, FFmpeg, LibreOffice, Krita, …) appear with correct metadata but no
  download buttons until an OmniSource deployment indexes those channels.
- The bundled feed's security report covers only the checks the ingest actually
  performed (metadata integrity, release-asset validation, licence provenance,
  repository activity). It runs **no** vulnerability, CVE or malware scanning and
  never claims to — point `OMNISOURCE_API_URL` at a real OmniSource for that.
- Favorites, follows and comparison selections are **device-local**. Account sync
  is designed for (see the store interface) but not implemented.
- End-to-end tests need Playwright browsers, which some sandboxes cannot download.

---

## Repository layout

```
src/app/**               routes: pages and /api/v1/* handlers
src/components/**        UI: app, search, collection, platform, layout, primitives
src/lib/omnisource/**    the OmniSource SDK: client, endpoint groups, mappers
src/lib/omnisource/feed/ bundled-feed catalog + v1 request router (server-only)
src/lib/library/**       device-local library, notes, share links
src/lib/favorites/**     device-local favorites store
src/lib/track/**         source tracking
src/lib/security/**      URL hardening
src/config/**            site metadata, feature flags
packages/shared-models/  the OmniSource v1 contract (zod schemas, DTOs, mappers)
data/sources.json        curated upstream repositories
data/omnisource-feed.json generated catalog snapshot (committed)
scripts/ingest.mjs       upstream → validated OmniSource-shaped feed
docs/                    client architecture and API contract
e2e/                     Playwright acceptance tests
```
