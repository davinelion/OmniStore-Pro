/** GET /api/v1/health — liveness of OmniStore + its OmniSource upstream. */
import { getOmnisource } from "@/lib/omnisource";
import { fail, ok } from "@/lib/omnisource/http";
import { site } from "@/config/site";
import { z } from "zod";

export const dynamic = "force-dynamic";

const UpstreamHealth = z
  .object({ status: z.string() })
  .partial()
  .catch({});

export async function GET() {
  try {
    const client = getOmnisource();
    const upstream = await client
      .request("/../health", UpstreamHealth, {
        retries: 0,
        timeoutMs: 3000,
        noStore: true,
      })
      .catch(() => null);
    return ok({
      status: "ok",
      version: site.version,
      upstream: upstream ? (upstream as { status?: string }).status ?? "unknown" : "unreachable",
      upstreamUrl: client.baseUrl.replace(/^https?:\/\//, ""),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return fail(error);
  }
}
