/**
 * OmniSource-Pro update webhook.
 *
 * OmniSource sends an event after a catalog ingest. The listener invalidates
 * the exact Next.js Data Cache tags used by the SDK-backed pages, so ISR
 * refreshes on the next request without a manual redeploy or browser refresh.
 */
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validSignature(payload: string, signature: string | null): boolean {
  const secret = process.env.OMNISOURCE_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const supplied = signature.replace(/^sha256=/, "");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(supplied, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("x-omnisource-signature") ?? request.headers.get("x-hub-signature-256");
  if (!validSignature(payload, signature)) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Invalid webhook signature" } }, { status: 401 });
  }

  let event: { type?: string; appId?: string; slug?: string } = {};
  try {
    event = JSON.parse(payload) as typeof event;
  } catch {
    return NextResponse.json({ error: { code: "bad_request", message: "Webhook body must be JSON" } }, { status: 400 });
  }

  const tags = new Set(["apps", "latest", "trending", "stats", "collections", "categories", "developers", "recommendations"]);
  if (event.appId) tags.add(`app:${event.appId}`);
  if (event.slug) tags.add(`app:${event.slug}`);
  for (const tag of tags) revalidateTag(tag);

  return NextResponse.json({ revalidated: [...tags], event: event.type ?? "catalog.updated" });
}
