import { EventSchema } from "@/lib/telemetry/events";
import { apiError, json } from "@/lib/api/http";
export const dynamic = "force-dynamic";
let windowStart = 0;
let count = 0;
/** Optional count-only event sink. No URLs, queries, identifiers, IPs, or error messages. */
export async function POST(request: Request) {
  if (process.env.NEXT_PUBLIC_ENABLE_ANALYTICS !== "true")
    return apiError("disabled", 404);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return apiError("invalid_origin", 403);
  if (Date.now() - windowStart > 60000) {
    windowStart = Date.now();
    count = 0;
  }
  if (++count > 600) return apiError("rate_limited", 429);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return apiError("invalid_request", 415);
  // Bound the stream, not just the optional Content-Length header.
  const reader = request.body?.getReader();
  if (!reader) return apiError("invalid_request", 400);
  let raw = "";
  let bytes = 0;
  const decoder = new TextDecoder();
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      bytes += result.value.byteLength;
      if (bytes > 256) {
        await reader.cancel();
        return apiError("payload_too_large", 413);
      }
      raw += decoder.decode(result.value, { stream: true });
    }
    raw += decoder.decode();
    const parsed = EventSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return apiError("invalid_request", 400);
    // Operators can aggregate these structured count records with their host's
    // log collector. This is not durable analytics storage or unique-user tracking.
    console.info(
      JSON.stringify({
        service: "omnistore",
        metric: parsed.data.event,
        count: 1,
      }),
    );
    return json({ ok: true }, { status: 202 });
  } catch {
    return apiError("invalid_request", 400);
  }
}
