import { getProvider } from "@/lib/api";
import { json } from "@/lib/api/http";

export const dynamic = "force-dynamic";

/** GET /api/v1/home — homepage payload in a single round trip. */
export async function GET() {
  const result = await getProvider().getHome();
  return json(result, { cacheSeconds: 300 });
}
