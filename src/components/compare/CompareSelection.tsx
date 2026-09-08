"use client";

import Link from "next/link";
import { GitCompare } from "lucide-react";

import { useComparison } from "@/hooks/useComparison";
import { MAX_COMPARE } from "@/lib/compare";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";

/**
 * Adds an app to the comparison tray.
 *
 * The tray appears as soon as two apps are selected, so the feature is
 * discoverable without navigating away.
 */
export function CompareSelection({ appId, name }: { appId: string; name: string }) {
  const comparison = useComparison();
  const selected = comparison.has(appId);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          const added = comparison.toggle(appId);
          if (added) track("compare_add", { appId });
        }}
        disabled={!selected && comparison.isFull}
        aria-pressed={selected}
        aria-label={selected ? `Remove ${name} from comparison` : `Add ${name} to comparison`}
        title={
          !selected && comparison.isFull ? `You can compare up to ${MAX_COMPARE} applications` : undefined
        }
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors disabled:opacity-50",
          selected
            ? "border-accent/40 bg-accent-soft text-accent"
            : "border-line hover:bg-surface-2",
        )}
      >
        <GitCompare className="h-4 w-4" aria-hidden />
        {selected ? "Comparing" : "Compare"}
      </button>

      <CompareTray />
    </>
  );
}

/** Fixed bottom tray: shows the current selection and links to the comparison. */
export function CompareTray() {
  const comparison = useComparison();
  if (comparison.ids.length < 2) return null;

  return (
    <div
      role="region"
      aria-label="Comparison selection"
      className="fixed inset-x-0 bottom-16 z-30 mx-auto flex max-w-content justify-center px-4 md:bottom-4"
    >
      <div className="flex items-center gap-3 rounded-full border border-line bg-surface/95 px-4 py-2 shadow-raised backdrop-blur">
        <span className="text-sm text-muted">
          {comparison.ids.length} app{comparison.ids.length === 1 ? "" : "s"} selected
        </span>
        <Link
          href={`/compare?ids=${comparison.ids.join(",")}`}
          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-accent px-3 text-sm text-accent-fg transition-colors hover:bg-accent-hover"
        >
          <GitCompare className="h-3.5 w-3.5" aria-hidden />
          Compare
        </Link>
        <button
          type="button"
          onClick={comparison.clear}
          className="text-sm text-fg-muted transition-colors hover:text-fg"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
