/** GET /api/v1/trending — OmniSource trending. */
import { getOmnisource } from "@/lib/omnisource";
import { fail, ok } from "@/lib/omnisource/http";

export const revalidate = 600;

export async function GET() {
  try {
    return ok(await getOmnisource().getTrending());
  } catch (error) {
    return fail(error);
  }
}
