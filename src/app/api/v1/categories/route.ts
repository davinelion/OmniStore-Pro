import { getProvider } from "@/lib/api";
import { json } from "@/lib/api/http";

export const dynamic = "force-dynamic";

/** GET /api/v1/categories — taxonomy with live counts. */
export async function GET() {
  const items = await getProvider().getCategories();
  return json({ items }, { cacheSeconds: 3600 });
}
