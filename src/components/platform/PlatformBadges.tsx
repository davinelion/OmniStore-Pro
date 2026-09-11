"use client";

import { Laptop, Monitor, Smartphone, Tablet, Terminal } from "lucide-react";

import type { Platform } from "@omnistore/shared-models";
import { cn } from "@/lib/utils";

const ICONS: Record<Platform, typeof Smartphone> = {
  ios: Smartphone,
  ipados: Tablet,
  android: Smartphone,
  windows: Monitor,
  macos: Laptop,
  linux: Terminal,
};

/** Compact platform indicator row (aria-labelled, no text needed). */
export function PlatformBadgeRow({
  platforms,
  className,
}: {
  platforms: readonly Platform[];
  className?: string;
}) {
  if (platforms.length === 0) return null;
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {platforms.map((platform) => {
        const Icon = ICONS[platform];
        return (
          <span key={platform} title={platform} className="inline-flex">
            <Icon className="h-3.5 w-3.5" aria-label={platform} role="img" />
          </span>
        );
      })}
    </span>
  );
}
