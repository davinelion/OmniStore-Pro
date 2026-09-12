# Developer guide

## Commands

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm run test:unit
npm run i18n:check
npm run build
```

Run `npm run ingest` only when intentionally refreshing the local development
snapshot from real upstream sources. It is not part of the production request
path.

## Adding a catalog surface

1. Add or reuse a shared model and wire schema in `packages/shared-models`.
2. Add a method to `packages/omnisource-sdk` if the endpoint is new.
3. Add the Next adapter endpoint in `src/lib/omnisource` with cache tags.
4. Consume the adapter from a server component or a React Query hook; do not
   read `data/omnisource-feed.json` from UI code.
5. Add loading, error, empty, and not-found states.
6. Add message keys to `messages/en.json` and every locale. Run the locale
   parity check below.
7. Add analytics only through the consent-gated `trackEvent` helper.

## Translation parity

Every locale must have the same leaf-key set as English. A simple validation
command is:

```bash
node - <<'NODE'
const fs = require('fs');
const leaf = (v, p = '') => typeof v === 'object' && v ? Object.entries(v).flatMap(([k, x]) => leaf(x, p ? `${p}.${k}` : k)) : [p];
const en = new Set(leaf(JSON.parse(fs.readFileSync('messages/en.json'))));
for (const file of fs.readdirSync('messages').filter(x => x.endsWith('.json'))) {
  const keys = new Set(leaf(JSON.parse(fs.readFileSync(`messages/${file}`))));
  if (keys.size !== en.size || [...en].some(x => !keys.has(x))) throw new Error(`${file} is incomplete`);
}
console.log('all locales are complete');
NODE
```

## Accessibility and SEO

Keep one `h1` per route, preserve visible focus, label icon-only controls, use
semantic landmarks, and test keyboard paths. App pages should retain canonical,
Open Graph, Twitter, SoftwareApplication JSON-LD, and breadcrumb metadata when
adding new detail sections.
