import { getProvider } from "@/lib/api";
import { json } from "@/lib/api/http";

export const dynamic = "force-dynamic";

/** GET /api/v1/latest — recently added, updated and released. */
export async function GET() {
  const result = await getProvider().getLatest();
  return json(result, { cacheSeconds: 300 });
}
