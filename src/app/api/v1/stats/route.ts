import { getProvider } from "@/lib/api";
import { json } from "@/lib/api/http";

export const dynamic = "force-dynamic";

/** GET /api/v1/stats — catalog statistics. */
export async function GET() {
  const stats = await getProvider().getStats();
  return json({ stats }, { cacheSeconds: 600 });
}
