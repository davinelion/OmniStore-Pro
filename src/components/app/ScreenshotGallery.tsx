"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";

import { safeImageUrl } from "@/lib/security/urls";
import { cn } from "@/lib/utils";

/**
 * Responsive screenshot gallery.
 *
 * Renders nothing when upstream publishes no screenshots — OmniStore never
 * substitutes placeholder artwork.
 */
export function ScreenshotGallery({
  screenshots,
  appName,
}: {
  screenshots: string[];
  appName: string;
}) {
  const [active, setActive] = useState(0);
  const [failed, setFailed] = useState<Set<number>>(new Set());

  const usable = screenshots
    .map((url, index) => ({ url, index }))
    .filter(({ url, index }) => Boolean(safeImageUrl(url)) && !failed.has(index));

  if (usable.length === 0) return null;

  const current = usable[Math.min(active, usable.length - 1)]!;

  return (
    <div className="space-y-3">
      <div className="card relative flex aspect-[16/9] items-center justify-center overflow-hidden bg-surface-2">
        {/* Upstream image hosts vary; native <img> keeps remote loading robust. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={current.url}
          src={current.url}
          alt={`${appName} screenshot ${current.index + 1}`}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-contain"
          onError={() =>
            setFailed((prev) => new Set(prev).add(current.index))
          }
        />
      </div>
      {usable.length > 1 ? (
        <div
          className="no-scrollbar flex gap-2 overflow-x-auto pb-1"
          role="tablist"
          aria-label={appName}
        >
          {usable.map(({ url, index }) => (
            <button
              key={url}
              type="button"
              role="tab"
              aria-selected={index === current.index}
              aria-label={`${appName} screenshot ${index + 1}`}
              onClick={() => setActive(index)}
              className={cn(
                "relative h-14 w-24 shrink-0 overflow-hidden rounded-lg border transition-colors",
                index === current.index
                  ? "border-accent"
                  : "border-line opacity-70 hover:opacity-100",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
                onError={() => setFailed((prev) => new Set(prev).add(index))}
              />
            </button>
          ))}
        </div>
      ) : null}
      {failed.size > 0 && failed.size === screenshots.length ? (
        <p className="flex items-center gap-2 text-sm text-muted">
          <ImageOff className="h-4 w-4" aria-hidden /> No screenshots could be
          loaded.
        </p>
      ) : null}
    </div>
  );
}
