import { getProvider } from "@/lib/api";
import { json } from "@/lib/api/http";
import { flags } from "@/config/flags";
import { site } from "@/config/site";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/config — runtime configuration.
 *
 * Lets the client read feature flags and provider identity without inlining
 * build-time values into every component.
 */
export async function GET() {
  const provider = getProvider();
  const meta = await provider.getFeedMeta();
  return json(
    {
      site: { name: site.name, version: site.version, description: site.description },
      flags,
      provider: { name: provider.name, origin: provider.origin },
      freshness: meta.generated_at,
    },
    { cacheSeconds: 600 },
  );
}
