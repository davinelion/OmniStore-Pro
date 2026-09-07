import { getProvider } from "@/lib/api";
import { json } from "@/lib/api/http";
import { parseFilters } from "@/lib/search/query";
import { track } from "@/lib/analytics";

export const dynamic = "force-dynamic";

/** GET /api/v1/search — universal search with filters, sorting and pagination. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const filters = parseFilters(Object.fromEntries(url.searchParams.entries()));
  const result = await getProvider().search(filters);
  if (filters.q) track("search", { query: filters.q, results: result.pagination.total });
  return json(result, { cacheSeconds: 60 });
}
