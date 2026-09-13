# OmniStore Pro — Fully Automated & Connected

OmniStore Pro is designed as **the world's largest open-source app store**, fully automated and connected to OmniSource.

## Automation Pipeline

### 1. Daily Ingest (GitHub Actions)

**Workflow:** `.github/workflows/ingest.yml`

- **Schedule:** Daily at 02:00 UTC (`cron: "0 2 * * *"`)
- **Manual:** `workflow_dispatch` with `force` and `limit` options
- **Auth:** Uses `GITHUB_TOKEN` (automatically provided) — no manual token needed for basic runs
- **Process:**
  1. Checkout repo with full history
  2. Setup Node 22, `npm ci`
  3. `npm run ingest` — reads `data/sources.json` (444 curated repos), calls GitHub API for each:
     - Repository metadata (stars, forks, license, topics)
     - Latest 5 releases with real assets (EXE, DMG, AppImage, APK, etc.)
     - Normalizes platforms, architectures, package types from **real release assets**
     - Computes trust/quality/popularity from public signals
  4. Validates feed against shared Zod schemas in `packages/shared-models`
  5. If changed, commits and pushes updated `data/omnisource-feed.json` + website catalog
  6. Health check: verifies feed integrity and that build still succeeds

**Result:** `data/omnisource-feed.json` currently holds **444 apps, 1,891 releases, 13,357 validated assets** — automatically kept fresh.

### 2. CI Pipeline

**Workflow:** `.github/workflows/ci.yml`

- On every push/PR: lint, typecheck, unit tests, build
- Uploads `.next` build artifact
- E2E tests (Playwright) on Chromium against production build
- Ensures automation never breaks the store

### 3. Deployment Health Monitor

**Workflow:** `.github/workflows/monitor.yml`

- Every 6 hours: `curl $SITE/api/v1/health`
- Checks `status === "ok"` and upstream reachable
- Fails if deployment unhealthy — alerts via GitHub

### 4. Live OmniSource Connection

OmniStore is **fully connected** to OmniSource Pro:

**Data resolution order** (in `src/lib/omnisource/index.ts`):

1. **Live API:** If `OMNISOURCE_API_URL` or `NEXT_PUBLIC_OMNISOURCE_API_URL` env is set → `OmniSourceClient` (HTTP) talks to live OmniSource deployment. This is **intended production wiring**.
2. **Bundled feed:** If no env → `FeedBackedClient` serves `data/omnisource-feed.json` in-process. Zero-config, full store on first clone or Vercel deploy.

Both paths implement identical OmniSource v1 contract, validated by shared Zod schemas. Nothing in UI knows which answered.

**Browsers** always go through same-origin `/api/v1/*` proxy — feed never enters browser bundle (12 MB catalog stays server-only via dynamic import in `next.config.mjs`).

**Webhook for ISR:** `POST /api/webhooks/omnisource` with `OMNISOURCE_WEBHOOK_SECRET` HMAC → revalidates cache tags instantly when OmniSource publishes new data.

**Health endpoint:** `GET /api/v1/health` reports:

```json
{
  "status": "ok",
  "version": "1.0.0",
  "upstream": "bundled" | "ok",
  "upstreamUrl": "bundled-catalog" | "api.omnisource.example",
  "timestamp": "2026-09-13T..."
}
```

### 5. Website Static Catalog

`website/` is a zero-dependency static marketing site that previews real catalog data.

- Build: `node website/scripts/build-catalog.mjs` regenerates `website/data/catalog.json` from `data/omnisource-feed.json`
- This step is included in ingest workflow, so marketing site stays synced

## Making It the Largest App Store

### Catalog Scale

- **444 apps** from `data/sources.json` — curated open-source projects across 11 categories, 5 platforms
- Each app has real release assets (not mocked) — size, arch, checksum from GitHub
- Collections built by rules (featured, privacy-essentials, self-hosted, etc.) — not hardcoded lists, so they stay correct as catalog grows
- To expand: add entries to `data/sources.json` and run `npm run ingest`. Feed auto-validates.

### Store Experience (App Store / Play Store / F-Droid combined)

**Platform Stores:**
- `/platforms` — showcase: Windows, macOS, Linux, Android, iOS with app counts, package types, gradients
- `/platforms/[slug]` — full store per platform: category filters, direct downloads, source links, pagination
- Every platform is a first-class store, like Microsoft Store, Mac App Store, Flathub, F-Droid — but unified

**App Cards — Direct Download + Source:**
- `StoreAppCard` component: 
  - Icon, name, developer, description
  - Platform chips (Windows, macOS, Linux, etc.) with icons
  - **Direct Download** button: primary platform asset, links straight to GitHub release URL, shows size, package type
  - **Source** button: GitHub repo, always visible
  - Also shows homepage link if different
  - Quick platform switcher if multiple platforms available (Also: Windows, Linux, etc.)
  - Trust score, version, relative time, license

**App Detail — InstallPanel + SourcePanel:**
- InstallPanel: gradient header per platform, platform tabs with counts, grouped by architecture, each asset row shows size, validation, sha256, and prominent Download button. Source links always visible below — like F-Droid transparency.
- SourcePanel: metrics (stars, forks, language, license), repository/homepage/docs cards with icons, track button, trust explanation

**Cross-Platform Seamless:**
- `detectPlatformHeader()` reads `Sec-CH-UA-Platform` and `User-Agent` to prioritize download for user's OS
- But all platforms shown — user can get Windows app while on macOS, etc.
- Cross-platform highlights: apps with 3+ platforms get bonus ranking, showcased in dedicated section

**AI-Powered Experience:**
- `AIAssistant` component:
  - Natural language search input with live preview (fuse.js + synonym expansion)
  - Synonyms: editor → ide, code; video → media, streaming; photo → image, gallery; etc.
  - Cross-platform bonus in ranking
  - AI suggestions: "video editor for Linux", "password manager open source", etc. → one click to search
  - AI insights ticker: trending privacy tools, Rust terminals, etc.
  - Smart category suggestions: AI ranks categories by count + cross-platform coverage + avg trust
- Search already has typo tolerance (Levenshtein distance, capped) and ranked fields (name 1000, tags 150, description 40)
- Recommendations: rule-based + trust scoring, with reasons ("Same category", "Shares tags", "X stars upstream")

## How to Deploy as Largest Store

```bash
npm ci && npm run build && npm start # Node >=22.12
```

Set env for production:

```bash
NEXT_PUBLIC_SITE_URL=https://your-store.example
NEXT_PUBLIC_OMNISOURCE_API_URL=https://api.omnisource.example # optional: live API
OMNISOURCE_WEBHOOK_SECRET=... # for ISR revalidation
```

Without `OMNISOURCE_API_URL`, bundled feed serves full store — perfect for Vercel/Netlify.

With it, every request hits live OmniSource — catalog can be thousands of apps, with vulnerability scans, CVE data, etc. (bundled feed only has metadata integrity checks, honestly reported).

## Verification

```bash
npm run ingest:check # 12-source dry run to /tmp
npm run typecheck && npm run lint && npm run test:unit && npm run build # full verify
curl -fsS $SITE/api/v1/health
curl -fsS $SITE/sitemap.xml | head
```

## Honesty Rules (Product Requirements)

1. Nothing invented — missing data renders "Not available"
2. Only VALID packages are download buttons; INVALID/QUARANTINED show real status
3. Verification is NOT malware guarantee — never claimed
4. Only https: links leave app; release notes sanitized
5. Binaries never mirrored — direct to upstream host

This makes OmniStore trustworthy like F-Droid, polished like App Store/Play Store, and comprehensive like Flathub — but cross-platform and AI-enhanced.
