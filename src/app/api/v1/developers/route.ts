import { getProvider } from "@/lib/api";
import { json } from "@/lib/api/http";

export const dynamic = "force-dynamic";

/** GET /api/v1/developers — upstream developers with app counts. */
export async function GET() {
  const items = await getProvider().getDevelopers();
  return json({ items }, { cacheSeconds: 3600 });
}
