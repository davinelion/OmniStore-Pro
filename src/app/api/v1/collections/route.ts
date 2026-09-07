import { getProvider } from "@/lib/api";
import { json } from "@/lib/api/http";

export const dynamic = "force-dynamic";

/** GET /api/v1/collections — curated and rule-generated collections. */
export async function GET() {
  const items = await getProvider().getCollections();
  return json({ items }, { cacheSeconds: 3600 });
}
