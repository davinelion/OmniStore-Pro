"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "h-10 w-10 text-base",
  md: "h-12 w-12 text-lg",
  lg: "h-16 w-16 text-2xl",
  xl: "h-24 w-24 text-4xl",
} as const;

export type AppIconSize = keyof typeof SIZES;

/**
 * App icon with a guaranteed fallback.
 *
 * Upstream icons are remote images that can 404, be slow or be blocked. When
 * that happens we degrade to a letter tile instead of showing a broken image.
 */
export function AppIcon({
  name,
  src,
  size = "md",
  className,
  rounded = "rounded-2xl",
}: {
  name: string;
  src?: string | null;
  size?: AppIconSize;
  className?: string;
  rounded?: string;
}) {
  const [failed, setFailed] = useState(false);
  const letter = (name.trim()[0] ?? "?").toUpperCase();

  if (!src || failed) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center border border-line bg-accent-soft font-semibold text-accent",
          SIZES[size],
          rounded,
          className,
        )}
        aria-hidden
        data-testid="app-icon-fallback"
      >
        {letter}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      width={96}
      height={96}
      onError={() => setFailed(true)}
      className={cn("shrink-0 border border-line bg-surface object-cover", SIZES[size], rounded, className)}
    />
  );
}
