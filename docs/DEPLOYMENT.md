# Production deployment

## Vercel

1. Import the repository as a Next.js project.
2. Use Node `22.12` or newer.
3. Set `OMNISOURCE_API_URL` to the OmniSource-Pro `/api/v1` base URL.
4. Set `OMNISOURCE_API_KEY` in server-only environment variables when the API
   requires it. Never expose it as `NEXT_PUBLIC_*`.
5. Set `NEXT_PUBLIC_SITE_URL` to the production origin.
6. Set `NEXT_PUBLIC_OMNISOURCE_IMAGE_HOSTS` to the exact HTTPS media hosts
   OmniSource serves, comma-separated.
7. Set `OMNISOURCE_WEBHOOK_SECRET` and register
   `/api/webhooks/omnisource` with OmniSource-Pro.
8. Optionally configure `NEXT_PUBLIC_POSTHOG_KEY` and
   `NEXT_PUBLIC_POSTHOG_HOST`.

The project already declares ISR revalidation on catalog pages, security
headers, the PWA worker, sitemap and robots routes. Vercel's edge network can
cache the public `/api/v1` GET responses; user/session routes are explicitly
uncached.

## Webhook contract

Send a JSON body and an `X-OmniSource-Signature: sha256=<hex>` header. The hex
value is HMAC-SHA256 of the exact request body using `OMNISOURCE_WEBHOOK_SECRET`.
A valid request invalidates app, taxonomy, collection, recommendation, trending,
and stats tags. The next request refreshes the UI without a manual refresh.

## Security checklist

- Keep API keys and webhook secrets server-only.
- Restrict image hosts to known OmniSource media hosts.
- Put a managed rate limit or Vercel Firewall rule in front of public mutation
  routes in production. The source submission route includes a bounded in-memory
  guard for single-instance deployments.
- Use the signed webhook route; unsigned requests are rejected.
- Set PostHog only when the deployment has a documented consent policy.
- Run `npm run typecheck`, `npm run lint`, `npm run test:unit`, and `npm run build`
  before promoting a deployment.
