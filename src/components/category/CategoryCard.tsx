import Link from "next/link";
import { FolderOpen } from "lucide-react";

import type { Category } from "@omnistore/shared-models";
import { cn } from "@/lib/utils";

/** Category tile driven entirely by the OmniSource taxonomy. */
export function CategoryCard({
  category,
  className,
}: {
  category: Category;
  className?: string;
}) {
  return (
    <Link
      href={`/categories/${category.slug}`}
      className={cn(
        "card card-interactive flex items-center gap-3 p-4 hover:shadow-card",
        className,
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
        <FolderOpen className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{category.name}</span>
        {category.description ? (
          <span className="line-clamp-1 block text-xs text-muted">
            {category.description}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
