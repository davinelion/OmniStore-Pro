import Link from "next/link";
import { Users } from "lucide-react";

import type { Developer } from "@omnistore/shared-models";
import { cn } from "@/lib/utils";

/** Developer tile: avatar derivation, name, app count. */
export function DeveloperCard({
  developer,
  appCount,
  className,
}: {
  developer: Developer;
  appCount?: number;
  className?: string;
}) {
  return (
    <Link
      href={`/developers/${developer.slug}`}
      className={cn(
        "card card-interactive flex items-center gap-3 p-4 hover:shadow-card",
        className,
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-3 text-fg-muted">
        <Users className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{developer.name}</span>
        {appCount != null ? (
          <span className="block text-xs text-muted">
            {appCount} {appCount === 1 ? "app" : "apps"}
          </span>
        ) : (
          <span className="block truncate text-xs text-muted">@{developer.slug}</span>
        )}
      </span>
    </Link>
  );
}
