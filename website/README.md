# OmniStore Pro — official website

Static marketing site for [OmniStore Pro](https://github.com/iamsmmh/OmniStore-Pro) —
zero dependencies, zero build step. Plain HTML, CSS and vanilla JavaScript.

Every number and every app shown on the site comes from the real catalog:
[`js/catalog.js`](js/catalog.js) is generated from
[`data/omnisource-feed.json`](../data/omnisource-feed.json) and never hand-edited.

## Layout

```
website/
├── index.html              the site (single page, all sections)
├── css/styles.css          design system mirroring the store app
├── js/catalog.js           REAL catalog data (generated — do not edit)
├── js/main.js              behaviour: theme, marquee, stats, tabs, copy…
├── assets/og-image.png     Open Graph / Twitter share card (1200×630)
├── assets/icon-180.png     apple-touch-icon
├── favicon.svg
└── scripts/build-catalog.mjs  regenerates js/catalog.js from the feed
```

## Regenerate catalog data

After `npm run ingest` (or any feed refresh):

```bash
node website/scripts/build-catalog.mjs
```

Reads `data/omnisource-feed.json` and rewrites `js/catalog.js` — stats, the
popular-app marquee, the featured storefront, categories, platforms and
collections. Pass `--feed <path>` to use a different feed file.

## Run it

Any static file server works:

```bash
# from the repo root
npx serve website            # or
python3 -m http.server 8080 --directory website
```

## Deploy

- **GitHub Pages** — point Pages at the `website/` directory (Settings → Pages →
  Source: main branch, `/website`), or push `website/` to a
  `gh-pages` branch. Relative asset URLs work as-is.
- **Netlify / Vercel / Cloudflare Pages** — set the publish directory to
  `website/`. No build command needed.
- **Any static host** — copy the folder, open `index.html`.

When the site gets a permanent domain, update the `og:image` and
`twitter:image` meta tags in `index.html` to absolute URLs.

## Design notes

The visual system is mirrored from the store app itself
(`src/app/globals.css` + `tailwind.config.ts`): dark-first glass/aurora theme,
electric violet → cyan accents, Space Grotesk / Inter / JetBrains Mono.
Light/dark toggle persists in `localStorage` and applies before first paint.
`prefers-reduced-motion` disables the aurora, marquee and reveal animations.
