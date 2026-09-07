import { getProvider } from "@/lib/api";
import { json } from "@/lib/api/http";

export const dynamic = "force-dynamic";

/** GET /api/v1/platforms — supported platforms with live counts and install hints. */
export async function GET() {
  const items = await getProvider().getPlatforms();
  return json({ items }, { cacheSeconds: 3600 });
}
