import { getProvider } from "@/lib/api";
import { json } from "@/lib/api/http";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/trending
 *
 * Ranked from measurable upstream signals only. OmniStore does not publish
 * daily or weekly deltas it cannot compute from a single catalog snapshot.
 */
export async function GET() {
  const result = await getProvider().getTrending();
  return json(result, { cacheSeconds: 300 });
}
