/** GET /api/v1/categories — the taxonomy. */
import { getOmnisource } from "@/lib/omnisource";
import { fail, ok } from "@/lib/omnisource/http";

export const revalidate = 1800;

export async function GET() {
  try {
    return ok(await getOmnisource().getCategories());
  } catch (error) {
    return fail(error);
  }
}
