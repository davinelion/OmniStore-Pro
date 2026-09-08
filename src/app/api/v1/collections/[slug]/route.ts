import { getProvider } from "@/lib/api";
import { json, notFound } from "@/lib/api/http";

export const dynamic = "force-dynamic";

/** GET /api/v1/collections/{slug} — one collection with its resolved apps. */
export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  const result = await getProvider().getCollection(params.slug);
  if (!result) return notFound("Collection not found");
  return json(result, { cacheSeconds: 3600 });
}
