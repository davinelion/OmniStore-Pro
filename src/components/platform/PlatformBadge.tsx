import {
  Laptop,
  Monitor,
  Smartphone,
  Tablet,
  Terminal,
  type LucideIcon,
} from "lucide-react";

import type { App, Platform } from "@/lib/schemas/omnisource";
import { platformLabel } from "@/lib/formatters";
import { cn } from "@/lib/utils";

const ICONS: Record<Platform, LucideIcon> = {
  ios: Smartphone,
  ipados: Tablet,
  android: Smartphone,
  windows: Monitor,
  macos: Laptop,
  linux: Terminal,
};

/** Small availability marker used in cards and lists. */
export function PlatformBadge({
  platform,
  size = "sm",
  withIcon = true,
  className,
}: {
  platform: string;
  size?: "xs" | "sm";
  withIcon?: boolean;
  className?: string;
}) {
  const Icon = ICONS[platform as Platform] ?? Monitor;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-line bg-surface-2 text-fg-muted",
        size === "xs" ? "px-1.5 py-0.5 text-2xs" : "px-2 py-0.5 text-xs",
        className,
      )}
    >
      {withIcon ? <Icon className="h-3 w-3" aria-hidden /> : null}
      {platformLabel(platform)}
    </span>
  );
}

/**
 * Full availability matrix.
 *
 * Shows absence as well as presence — a user should be able to see at a glance
 * that an app is *not* on their platform without hunting for a missing badge.
 */
export function PlatformAvailability({
  platforms,
  className,
  allPlatforms,
}: {
  platforms: string[];
  className?: string;
  allPlatforms?: readonly string[];
}) {
  const list = allPlatforms ?? ["ios", "ipados", "android", "windows", "macos", "linux"];
  const available = new Set(platforms);

  return (
    <ul className={cn("flex flex-wrap gap-2", className)}>
      {list.map((platform) => {
        const Icon = ICONS[platform as Platform] ?? Monitor;
        const isAvailable = available.has(platform);
        return (
          <li
            key={platform}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-sm",
              isAvailable
                ? "border-accent/30 bg-accent-soft text-accent"
                : "border-line bg-surface-2 text-fg-subtle",
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            <span>{platformLabel(platform)}</span>
            <span aria-hidden>{isAvailable ? "✓" : "—"}</span>
            <span className="sr-only">
              {isAvailable ? "available" : "not available"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Compact "3 / 5 platforms" indicator for cross-platform discovery. */
export function PlatformCount({ app }: { app: App }) {
  return (
    <span className="chip">
      {app.platforms.length} platform{app.platforms.length === 1 ? "" : "s"}
    </span>
  );
}
