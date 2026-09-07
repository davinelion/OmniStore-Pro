# OmniStore

Universal discovery and distribution interface for open-source applications.

OmniSource supplies metadata, validation, search, and feeds. OmniStore Web is the first complete client.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000

## Environment

See `.env.example`.

- `NEXT_PUBLIC_OMNISOURCE_API_URL` — optional upstream OmniSource base URL
- Catalog feed lives in `data/catalog.json` and is served through `/api/v1/*`

Never put secrets in `NEXT_PUBLIC_*`.

## Scripts

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run e2e`

## Deploy

- **Vercel:** import the repo, framework Next.js
- **Docker:** `docker build -t omnistore . && docker run -p 3000:3000 omnistore`
- **Self-host:** `npm run build && npm start`

## Architecture

See `docs/CLIENT_ARCHITECTURE.md`.
