/** GET /api/v1/apps/{id} — one app by id or slug. */
import { getOmnisource } from "@/lib/omnisource";
import { fail, notFoundResponse, ok } from "@/lib/omnisource/http";

export const revalidate = 120;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const app = await getOmnisource().getApp(decodeURIComponent(id));
    if (!app) return notFoundResponse();
    return ok(app);
  } catch (error) {
    return fail(error);
  }
}
