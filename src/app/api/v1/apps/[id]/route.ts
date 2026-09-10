import { getProvider } from "@/lib/api";
import { json, notFound } from "@/lib/api/http";

export const dynamic = "force-dynamic";

/** GET /api/v1/apps/{id} — one app by canonical id or slug. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const app = await getProvider().getApp(resolvedParams.id);
  if (!app) return notFound("App not found");
  return json(app, { cacheSeconds: 300 });
}
