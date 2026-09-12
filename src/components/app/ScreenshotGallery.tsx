"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Expand, ImageOff, X } from "lucide-react";

import { isTrustedImageUrl } from "@/lib/security/urls";
import { cn } from "@/lib/utils";

/**
 * Responsive, keyboard-friendly screenshot gallery. OmniSource owns the
 * imagery; absent or untrusted URLs are omitted instead of replaced with
 * invented artwork. The active image can be inspected in a fullscreen viewer.
 */
export function ScreenshotGallery({
  screenshots,
  appName,
}: {
  screenshots: string[];
  appName: string;
}) {
  const [active, setActive] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [failed, setFailed] = useState<Set<number>>(new Set());

  const usable = screenshots
    .map((url, index) => ({ url, index }))
    .filter(({ url, index }) => isTrustedImageUrl(url) && !failed.has(index));

  const current = usable[Math.min(active, Math.max(usable.length - 1, 0))];

  useEffect(() => {
    if (!viewerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setViewerOpen(false);
      if (event.key === "ArrowRight") setActive((value) => (value + 1) % usable.length);
      if (event.key === "ArrowLeft") setActive((value) => (value - 1 + usable.length) % usable.length);
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [viewerOpen, usable.length]);

  if (!current) return null;

  return (
    <div className="space-y-3">
      <div className="card group relative flex aspect-[16/9] items-center justify-center overflow-hidden bg-surface-2">
        <Image
          key={current.url}
          src={current.url}
          alt={`${appName} screenshot ${current.index + 1}`}
          fill
          sizes="(max-width: 1024px) 100vw, 720px"
          priority={current.index === 0}
          className="object-contain"
          onError={() => setFailed((prev) => new Set(prev).add(current.index))}
        />
        <button
          type="button"
          onClick={() => setViewerOpen(true)}
          className="absolute bottom-3 end-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/60 px-3 py-2 text-xs font-semibold text-white opacity-0 shadow-lg backdrop-blur transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          aria-label={`Open ${appName} screenshot ${current.index + 1} fullscreen`}
        >
          <Expand className="h-3.5 w-3.5" aria-hidden />
          View fullscreen
        </button>
      </div>
      {usable.length > 1 ? (
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label={`${appName} screenshots`}>
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
                index === current.index ? "border-accent" : "border-line opacity-70 hover:opacity-100",
              )}
            >
              <Image src={url} alt="" fill sizes="96px" className="object-cover" />
            </button>
          ))}
        </div>
      ) : null}
      {failed.size > 0 && failed.size === screenshots.length ? (
        <p className="flex items-center gap-2 text-sm text-muted">
          <ImageOff className="h-4 w-4" aria-hidden /> No screenshots could be loaded.
        </p>
      ) : null}

      {viewerOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`${appName} screenshot viewer`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setViewerOpen(false);
          }}
        >
          <button
            type="button"
            onClick={() => setViewerOpen(false)}
            className="absolute end-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Close fullscreen viewer"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
          {usable.length > 1 ? (
            <>
              <button
                type="button"
                onClick={() => setActive((value) => (value - 1 + usable.length) % usable.length)}
                className="absolute start-3 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 sm:start-8"
                aria-label="Previous screenshot"
              >
                <ChevronLeft className="h-6 w-6" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setActive((value) => (value + 1) % usable.length)}
                className="absolute end-3 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 sm:end-8"
                aria-label="Next screenshot"
              >
                <ChevronRight className="h-6 w-6" aria-hidden />
              </button>
            </>
          ) : null}
          <div className="relative h-[82vh] w-[92vw] max-w-6xl">
            <Image src={current.url} alt={`${appName} screenshot ${current.index + 1}`} fill sizes="92vw" className="object-contain" priority />
          </div>
        </div>
      ) : null}
    </div>
  );
}
