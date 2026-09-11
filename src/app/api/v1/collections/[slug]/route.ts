/** GET /api/v1/collections/{slug} — one collection with its ordered apps. */
import { getOmnisource } from "@/lib/omnisource";
import { fail, notFoundResponse, ok } from "@/lib/omnisource/http";

export const revalidate = 600;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const collection = await getOmnisource().getCollection(decodeURIComponent(slug));
    if (!collection) return notFoundResponse();
    return ok(collection);
  } catch (error) {
    return fail(error);
  }
}
