import { getProvider } from "@/lib/api";
import { json } from "@/lib/api/http";

export const dynamic = "force-dynamic";

/** GET /api/v1/licenses — licences present in the catalog, with counts. */
export async function GET() {
  const items = await getProvider().getLicenses();
  return json({ items }, { cacheSeconds: 3600 });
}
