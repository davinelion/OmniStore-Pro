import { getProvider } from "@/lib/api";
import { json } from "@/lib/api/http";

export const dynamic = "force-dynamic";

/** GET /api/v1/apps/{id}/alternatives — relationships computed by OmniSource. */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const items = await getProvider().getAlternatives(params.id);
  return json({ items }, { cacheSeconds: 600 });
}
