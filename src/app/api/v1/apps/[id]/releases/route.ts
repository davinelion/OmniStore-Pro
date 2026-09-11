/** GET /api/v1/apps/{id}/releases — release history (from the app payload). */
import { getOmnisource } from "@/lib/omnisource";
import { fail, notFoundResponse, ok } from "@/lib/omnisource/http";

export const revalidate = 300;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const app = await getOmnisource().getApp(decodeURIComponent(id));
    if (!app) return notFoundResponse();
    return ok({
      appId: app.id,
      releases: app.releases ?? [],
      latest: app.latestRelease ?? null,
    });
  } catch (error) {
    return fail(error);
  }
}
