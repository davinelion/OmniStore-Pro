import { getProvider } from "@/lib/api";
import { json, notFound } from "@/lib/api/http";

export const dynamic = "force-dynamic";

/** GET /api/v1/developers/{slug} — developer profile, apps and latest releases. */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const result = await getProvider().getDeveloper(resolvedParams.slug);
  if (!result) return notFound("Developer not found");
  return json(result, { cacheSeconds: 600 });
}
