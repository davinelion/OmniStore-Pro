/** GET /api/v1/stats — catalog statistics. */
import { getOmnisource } from "@/lib/omnisource";
import { fail, ok } from "@/lib/omnisource/http";

export const revalidate = 600;

export async function GET() {
  try {
    return ok(await getOmnisource().getStats());
  } catch (error) {
    return fail(error);
  }
}
