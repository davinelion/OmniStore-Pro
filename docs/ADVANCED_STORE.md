# Advanced store upgrade

## What works without external services

- `/updates`: followed-app release history, unread/read controls, stable/prerelease
  preferences and platform filtering. Existing snapshot releases start unread.
  Reads are keyed by both app and release IDs; they do not imply installation.
- `/library`: up to 50 named collections, 200 apps per collection, private notes,
  rename/remove/delete, additive validated JSON import and export. Add apps from
  favorites. Storage failures produce warnings; cross-tab changes refresh state.
- Sharing creates an explicit URL fragment containing the list name and app IDs,
  **not notes**. Anyone with the link can read it. Shared lists are previews until
  saved. Exported JSON **does contain private notes**. Links are capped at 12 KB;
  backups are capped at 1 MB. No link shortening, server publishing, or account sync.
- `/alternatives`: five editorial starting-point guides with catalog-resolved
  candidates, OS filtering, upstream evidence links and migration cautions.
  They do not claim feature parity. Offline/collaboration/import compatibility
  filters await sourced structured capability data; nothing is inferred from tags.
- `/catalog-health`: provider-paginated coverage, screenshots, checksums, missing
  assets, source freshness, archived projects. A source is stale after 14 days.
  It is metadata health, not a live link check or a malware score.
- App evidence panels separate URL validation, published digests, missing
  signatures and malware scanning. Downloads add architecture filtering and
  package-format guidance. Commands appear only for reviewed install recipes.
- `/api/v1/feed`: public RSS, stable releases by default. Optional `?app=<id-or-slug>`
  for one app; `&prereleases=true` includes prereleases. Catalog feed covers the
  provider's latest-release window; it is not full historical archival storage.
- `/contribute`: public GitHub issue forms for app proposals, metadata evidence
  and broken downloads. A maintainer must review/merge submissions.

Favorites now resolve in batches of eight instead of silently truncating long
lists. Sitemap aggregation now walks provider pagination. Next.js 15 async
route params and cookies are migrated. Runtime baseline is Node 22.12+.

## Reviewed metadata enrichment

`data/enrichments.json` intentionally starts empty. No screenshots, capabilities,
package identifiers or permissions have been fabricated to fill the catalog.
The ingestion pipeline validates this file with `EnrichmentsSchema` and merges
entries by case-insensitive official `owner/repo` identity before validating the
whole feed. Live OmniSource deployments must supply the same optional fields.

Each entry requires:

- `repository`: official `owner/repo` matching `app.source.repo`.
- `evidence_url`: official HTTPS documentation proving the correction.
- `reviewed_at`: ISO date-time of the actual human review.
- `screenshots`: URL, alt text, `source_url`, attribution, and license/permission
  basis. Permission is a reviewer assertion, not something schema validation can prove.
- `features`: optional sourced feature descriptions, not marketing assumptions.
- `installation`: platform, manager (`winget`, `brew`, `flatpak`, `snap`), exact
  `package_id`, and official `source_url`. Only the matching manager/platform
  combination is accepted; package identifiers cannot include shell operators,
  whitespace or leading options. Review recipes before merging.

Optional contract fields: `App.metadata_evidence`, `App.installation` and
screenshot attribution/source/permission. Old feeds still validate. Existing
screenshots without provenance remain compatible with the original contract;
new enrichment contributions must have evidence.

GitHub asset `digest` values are ingested only when they match `sha256:<64 hex>`.
These are **upstream-published** hashes, not independent binary verification.
Run `npm run ingest -- --only=owner/repo` after reviewing changes. It requires
network access and appropriate GitHub access; this upgrade does not refresh the
bundled snapshot or claim newly populated checksum coverage.

## Catalog reporting and sampled link checks

`npm run catalog:check` writes an offline coverage report to the ignored
`.reports/catalog-health.json`. Add `-- --links` for a bounded sample of one
current VALID asset per app (up to 200, concurrency four). Probes use HEAD, no
credentials, ten-second request timeouts, and at most four redirects restricted
to GitHub and its public release-asset hosts. Unsupported hosts, rate limits,
HEAD rejection and network failures are **unknown**, not broken downloads.
No binaries are fetched. This does not check every historical asset or promise
availability. Keep signed redirect URLs out of logs.

## Monitoring and analytics

1. Set `NEXT_PUBLIC_SITE_URL` to the real public HTTPS origin at build time
   (canonical URLs and RSS links depend on it).
2. Set GitHub repository variable `OMNISTORE_MONITOR_URL` to the deployment origin.
   The health workflow runs every six hours and fails on unavailable health,
   stale snapshots, or invalid dates. Enable GitHub Actions failure notifications.
   Scheduled workflows use the default branch; changes must be merged first.
3. Enable `NEXT_PUBLIC_ENABLE_ANALYTICS=true` at build and runtime only if desired.
   Visitors must additionally opt in on `/privacy`; Do Not Track overrides consent.
   `/api/v1/events` accepts a strict count-only event object (256-byte maximum),
   rejects cross-origin submissions and unknown fields, and emits structured JSON
   to server logs. **No search text, app IDs, notes, URLs, or error details are sent.**
   Route error counts and download clicks are instrumented. Existing track calls
   also use this sink. There is no unique-user identification or funnel attribution.
4. Connect the hosting platform's log collector to a durable dashboard if needed.
   Events are not stored in an application database. The per-process 600-event/min
   cap is abuse mitigation, not a distributed rate limit. Edge quotas and host log
   redaction/retention are deployment responsibilities. HTTP hosts can independently
   see ordinary request IPs; do not describe infrastructure logs as anonymous.
5. Dependabot covers npm and workflow updates. The lockfile upgrades Next/Vitest
   and overrides transitive PostCSS with a patched compatible 8.x version. Recheck
   compatibility and audit advisories when updating dependencies.

## Remaining product/service work

- Email and push notifications need subscription persistence, delivery services,
  unsubscribe controls and explicit permission; not implemented here.
- Optional account sync needs authentication, durable storage, access control,
  conflict resolution and deletion/export policies. Browsing remains account-free.
- Real screenshots, package recipes and detailed alternative capability claims
  still require upstream sourcing and human review.
- No native client, binary hosting, binary scanning, or installed-app detection.
- New navigation labels include Bangla; the new detailed page copy is English.
- Public reviews/ratings, AI recommendations and app-store payments are not part
  of this discovery-first upgrade.

## Validation

Run `npm ci`, `npm run verify`, `npm run test:integration`, `npm audit`, and
`npm run e2e` (after `npm run e2e:install`). New model, evidence, telemetry,
RSS, API batching, library component, and inbox component tests are included.
New browser acceptance specs cover the library and new routes. Browser execution
requires a working Chromium download; it must not be confused with passing
component tests.
