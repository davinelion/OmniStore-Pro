/** GET /api/v1/trust/{id} — transparent trust report (computed in OmniSource). */
import { getOmnisource } from "@/lib/omnisource";
import { fail, notFoundResponse, ok } from "@/lib/omnisource/http";

export const revalidate = 600;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const report = await getOmnisource().getTrust(decodeURIComponent(id));
    if (!report) return notFoundResponse();
    return ok(report);
  } catch (error) {
    return fail(error);
  }
}
