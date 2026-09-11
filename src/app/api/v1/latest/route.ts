/** GET /api/v1/latest — recently released/updated apps. */
import { getOmnisource } from "@/lib/omnisource";
import { fail, ok } from "@/lib/omnisource/http";

export const revalidate = 300;

export async function GET() {
  try {
    return ok(await getOmnisource().getRecent());
  } catch (error) {
    return fail(error);
  }
}
