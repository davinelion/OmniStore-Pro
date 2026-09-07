import { getProvider } from "@/lib/api";
import { badRequest, clientKey, json, parseBody, rateLimit } from "@/lib/api/http";
import { ReportSchema } from "@/lib/schemas/config";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/reports — metadata issue reports.
 *
 * Reports are recorded server-side and optionally forwarded to a webhook
 * (set OMNISTORE_REPORT_WEBHOOK_URL). No moderation platform lives here.
 */
export async function POST(request: Request) {
  if (!rateLimit(clientKey(request), 5, 60_000)) {
    return json({ error: { code: "rate_limited", message: "Too many reports. Try again shortly." } }, { status: 429 });
  }

  const payload = await parseBody(request, ReportSchema);
  if (!payload) return badRequest();

  // Confirm the app exists so reports cannot reference arbitrary ids.
  if (payload.appId) {
    const app = await getProvider().getApp(payload.appId);
    if (!app) return badRequest({ appId: "unknown app" });
  }

  const record = { id: crypto.randomUUID(), received_at: new Date().toISOString(), ...payload };

  // eslint-disable-next-line no-console
  console.info("[omnistore:report]", JSON.stringify(record));

  const webhook = process.env.OMNISTORE_REPORT_WEBHOOK_URL;
  if (webhook && /^https:\/\//.test(webhook)) {
    // Fire and forget: reporting must stay fast and never block on a third party.
    void fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(record),
    }).catch(() => undefined);
  }

  return json({ ok: true, id: record.id }, { status: 202 });
}
