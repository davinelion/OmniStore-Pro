import { getProvider } from "@/lib/api";
import { json, notFound } from "@/lib/api/http";

export const dynamic = "force-dynamic";

/** GET /api/v1/collections/{slug} — one collection with its resolved apps. */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const result = await getProvider().getCollection(resolvedParams.slug);
  if (!result) return notFound("Collection not found");
  return json(result, { cacheSeconds: 3600 });
}
