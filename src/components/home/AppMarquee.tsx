"use client";

import Link from "next/link";

import { AppIcon } from "@/components/app/AppIcon";

export interface MarqueeApp {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  shortDescription?: string | null;
}

/**
 * AppMarquee — a slow, seamless ribbon of real catalog apps.
 *
 * Pure CSS (`.animate-marquee`, content duplicated once so -50% loops
 * seamlessly), pauses on hover/focus, and renders a static row under
 * `prefers-reduced-motion`. Data comes from the server — no app data is
 * hardcoded here.
 */
export function AppMarquee({ apps, label }: { apps: MarqueeApp[]; label: string }) {
  if (apps.length === 0) return null;
  const row = [...apps, ...apps]; // duplicated for the seamless -50% loop

  return (
    <div
      className="marquee-paused fade-x relative -mx-2 mt-12 overflow-hidden px-2"
      role="list"
      aria-label={label}
    >
      <div className="animate-marquee flex w-max items-stretch gap-3 pr-3">
        {row.map((app, index) => (
          <Link
            key={`${app.id}-${index}`}
            href={`/app/${app.slug}`}
            role="listitem"
            tabIndex={index >= apps.length ? -1 : 0} // hide duplicates from tab order
            aria-hidden={index >= apps.length || undefined}
            className={
              "group flex w-64 shrink-0 items-center gap-3 rounded-2xl border border-line bg-surface/70 " +
              "p-3 backdrop-blur-sm transition-colors duration-200 hover:border-accent/50 hover:bg-surface"
            }
          >
            <AppIcon name={app.name} src={app.icon} size="sm" rounded="rounded-xl" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold group-hover:text-accent">
                {app.name}
              </span>
              <span className="block truncate text-xs text-subtle">
                {app.shortDescription || app.name}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
