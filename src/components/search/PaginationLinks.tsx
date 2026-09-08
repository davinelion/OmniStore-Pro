import Link from "next/link";

import type { SearchFilters } from "@/lib/search/query";
import { filtersToQuery } from "@/lib/search/query";
import { cn } from "@/lib/utils";

/**
 * Crawlable pagination for server-rendered listings.
 *
 * Real anchors (not buttons) so every page of the catalog is reachable by
 * crawlers and by keyboard users.
 */
export function PaginationLinks({
  filters,
  page,
  totalPages,
  basePath,
}: {
  filters: Partial<SearchFilters>;
  page: number;
  totalPages: number;
  basePath: string;
}) {
  if (totalPages <= 1) return null;

  const href = (target: number) => {
    const query = filtersToQuery({ ...filters, page: target > 1 ? target : undefined });
    return query ? `${basePath}?${query}` : basePath;
  };

  const pages = buildPageList(page, totalPages);

  return (
    <nav aria-label="Pagination" className="mt-10 flex flex-wrap items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link
          href={href(page - 1)}
          rel="prev"
          className="inline-flex h-9 items-center rounded-full border border-line px-3 text-sm hover:bg-surface-2"
        >
          Previous
        </Link>
      ) : null}

      {pages.map((entry, index) =>
        entry === "gap" ? (
          <span key={`gap-${index}`} className="px-1 text-fg-subtle">
            …
          </span>
        ) : (
          <Link
            key={entry}
            href={href(entry)}
            aria-current={entry === page ? "page" : undefined}
            aria-label={`Page ${entry}`}
            className={cn(
              "inline-flex h-9 min-w-9 items-center justify-center rounded-full px-3 text-sm",
              entry === page
                ? "bg-accent text-accent-fg"
                : "border border-line hover:bg-surface-2",
            )}
          >
            {entry}
          </Link>
        ),
      )}

      {page < totalPages ? (
        <Link
          href={href(page + 1)}
          rel="next"
          className="inline-flex h-9 items-center rounded-full border border-line px-3 text-sm hover:bg-surface-2"
        >
          Next
        </Link>
      ) : null}
    </nav>
  );
}

function buildPageList(page: number, totalPages: number): Array<number | "gap"> {
  const set = new Set<number>([1, totalPages, page, page - 1, page + 1]);
  const sorted = [...set].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const out: Array<number | "gap"> = [];
  let previous = 0;
  for (const current of sorted) {
    if (previous && current - previous > 1) out.push("gap");
    out.push(current);
    previous = current;
  }
  return out;
}
