"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { safeImageUrl } from "@/lib/security/urls";

const SIZES = {
  sm: "h-10 w-10 text-base",
  md: "h-12 w-12 text-lg",
  lg: "h-16 w-16 text-2xl",
  xl: "h-24 w-24 text-4xl",
} as const;

/**
 * Deterministic hue from the app name so every app keeps the same brand tile
 * across surfaces and themes, without storing any per-app metadata.
 */
function hueFor(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return hash % 360;
}

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

  const imageUrl = safeImageUrl(src);

  if (!imageUrl || failed) {
    const hue = hueFor(name);
    const gradient = `linear-gradient(140deg, hsl(${hue} 72% 52%), hsl(${(hue + 36) % 360} 78% 38%))`;
    return (
      <div
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden font-bold text-white",
          "ring-1 ring-black/10 dark:ring-white/10",
          SIZES[size],
          rounded,
          className,
        )}
        style={{ background: gradient }}
        aria-hidden
        data-testid="app-icon-fallback"
      >
        {/* Top-left sheen so the tile reads as a real app icon, not a flat chip. */}
        <span
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(120%_80%_at_28%_18%,rgb(255_255_255/0.38),transparent_58%)]"
        />
        <span
          className="relative"
          style={{ textShadow: "0 1px 2px rgb(0 0 0 / 0.28)" }}
        >
          {letter}
        </span>
      </div>
    );
  }

  return (
    <Image
      src={imageUrl}
      alt=""
      width={96}
      height={96}
      sizes="(max-width: 640px) 40px, 64px"
      onError={() => setFailed(true)}
      className={cn("shrink-0 border border-line bg-surface object-cover", SIZES[size], rounded, className)}
    />
  );
}
