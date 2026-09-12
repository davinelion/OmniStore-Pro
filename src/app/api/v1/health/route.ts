/** GET /api/v1/health — liveness of OmniStore + its OmniSource upstream. */
import { getOmnisource } from "@/lib/omnisource";
import { fail, ok } from "@/lib/omnisource/http";
import { site } from "@/config/site";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const client = getOmnisource();
    const upstream = await client.probeHealth(3000);
    return ok({
      status: "ok",
      version: site.version,
      upstream: upstream?.status ?? (upstream ? "unknown" : "unreachable"),
      upstreamUrl: client.baseUrl.replace(/^https?:\/\//, ""),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return fail(error);
  }
}
