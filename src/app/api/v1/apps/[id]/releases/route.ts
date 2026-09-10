import { getProvider } from "@/lib/api";
import { json, notFound } from "@/lib/api/http";

export const dynamic = "force-dynamic";

/** GET /api/v1/apps/{id}/releases — full release history, newest first. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const provider = getProvider();
  const app = await provider.getApp(resolvedParams.id);
  if (!app) return notFound("App not found");
  return json({ items: await provider.getReleases(resolvedParams.id) }, { cacheSeconds: 300 });
}
