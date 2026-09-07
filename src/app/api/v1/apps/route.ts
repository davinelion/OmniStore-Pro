import { getProvider } from "@/lib/api";
import { json } from "@/lib/api/http";
import { DEFAULT_PER_PAGE, parseFilters } from "@/lib/search/query";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/apps — catalog listing with filters, sorting and pagination.
 * GET /api/v1/apps?ids=a,b — resolve specific apps (used by comparison).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const ids = url.searchParams.get("ids");

  if (ids) {
    const list = ids.split(",").map((id) => id.trim()).filter(Boolean).slice(0, 8);
    const items = await getProvider().getAppsByIds(list);
    return json({
      items,
      pagination: { page: 1, per_page: list.length || DEFAULT_PER_PAGE, total: items.length, total_pages: 1 },
    });
  }

  const filters = parseFilters(Object.fromEntries(url.searchParams.entries()));
  const result = await getProvider().getApps(filters);
  return json(result, { cacheSeconds: 120 });
}
