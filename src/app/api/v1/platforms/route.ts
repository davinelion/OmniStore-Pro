/** GET /api/v1/platforms — platform taxonomy. */
import { getOmnisource } from "@/lib/omnisource";
import { fail, ok } from "@/lib/omnisource/http";

export const revalidate = 1800;

export async function GET() {
  try {
    return ok(await getOmnisource().getPlatforms());
  } catch (error) {
    return fail(error);
  }
}
