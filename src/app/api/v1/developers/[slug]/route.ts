/** GET /api/v1/developers/{slug} — developer profile with apps. */
import { getOmnisource } from "@/lib/omnisource";
import { fail, notFoundResponse, ok } from "@/lib/omnisource/http";

export const revalidate = 600;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const developer = await getOmnisource().getDeveloper(decodeURIComponent(slug));
    if (!developer) return notFoundResponse();
    return ok(developer);
  } catch (error) {
    return fail(error);
  }
}
