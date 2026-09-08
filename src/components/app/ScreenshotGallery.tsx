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
  screenshots: Array<{ url: string; alt: string | null }>;
  appName: string;
}) {
  const [active, setActive] = useState(0);
  const [failed, setFailed] = useState<Set<number>>(new Set());

  const images = screenshots
    .map((shot, index) => ({ ...shot, index, safeUrl: safeImageUrl(shot.url) }))
    .filter((shot): shot is { url: string; alt: string | null; index: number; safeUrl: string } =>
      Boolean(shot.safeUrl),
    );

  if (images.length === 0) {
    return (
      <section aria-labelledby="screenshots-heading">
        <h2 id="screenshots-heading" className="text-lg font-semibold">
          Screenshots
        </h2>
        <p className="mt-2 flex items-center gap-2 rounded-xl border border-dashed border-line px-4 py-6 text-sm text-muted">
          <ImageOff className="h-4 w-4" aria-hidden />
          Screenshots not available — upstream does not publish any through OmniSource.
        </p>
      </section>
    );
  }

  const current = images[Math.min(active, images.length - 1)];

  return (
    <section aria-labelledby="screenshots-heading">
      <h2 id="screenshots-heading" className="text-lg font-semibold">
        Screenshots
      </h2>

      {/* Mobile: horizontal scrolling strip. Desktop: preview + thumbnails. */}
      <div className="mt-3 flex gap-3 overflow-x-auto pb-2 no-scrollbar md:hidden" role="list">
        {images.map((shot) => (
          <div
            key={shot.url}
            role="listitem"
            className="relative aspect-[9/16] w-44 shrink-0 overflow-hidden rounded-2xl border border-line bg-surface-2"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={shot.safeUrl}
              alt={shot.alt ?? `${appName} screenshot`}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          </div>
        ))}
      </div>

      <div className="hidden md:block">
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-line bg-surface-2">
          {failed.has(current.index) ? (
            <div className="flex h-full items-center justify-center text-sm text-muted">
              Image unavailable
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={current.safeUrl}
              alt={current.alt ?? `${appName} screenshot ${current.index + 1}`}
              loading="lazy"
              decoding="async"
              onError={() => setFailed((prev) => new Set(prev).add(current.index))}
              className="h-full w-full object-contain"
            />
          )}
        </div>

        {images.length > 1 ? (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {images.map((shot, index) => (
              <button
                key={shot.url}
                type="button"
                onClick={() => setActive(index)}
                aria-label={`Show screenshot ${index + 1}`}
                aria-current={index === active}
                className={cn(
                  "h-16 w-28 shrink-0 overflow-hidden rounded-lg border transition-colors",
                  index === active ? "border-accent" : "border-line hover:border-line-strong",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={shot.safeUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
