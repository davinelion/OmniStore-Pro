"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Layers, Lock } from "lucide-react";

import type { Collection } from "@omnistore/shared-models";
import { cn } from "@/lib/utils";

/** Collection tile used on /collections and sidebar lists. */
export function CollectionCard({
  collection,
  className,
}: {
  collection: Collection;
  className?: string;
}) {
  const t = useTranslations("collections");
  return (
    <Link
      href={`/collection/${collection.slug}`}
      className={cn(
        "card card-interactive flex flex-col gap-2 p-4 hover:shadow-card",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
          {collection.isPublic ? (
            <Layers className="h-4 w-4" aria-hidden />
          ) : (
            <Lock className="h-4 w-4" aria-hidden />
          )}
        </span>
        <h3 className="min-w-0 flex-1 truncate text-[0.95rem] font-semibold">
          {collection.name}
        </h3>
      </div>
      {collection.description ? (
        <p className="line-clamp-2 text-sm text-muted">{collection.description}</p>
      ) : null}
      <p className="mt-auto text-xs text-subtle">
        {t("apps", { count: collection.itemCount })}
      </p>
    </Link>
  );
}
