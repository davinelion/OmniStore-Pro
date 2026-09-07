"use client";

import { useCallback, useEffect, useState } from "react";
import { Bookmark, Bell, Share2, Check, Link2, GitCompare } from "lucide-react";

import { useFavorites, useWatch } from "@/hooks/useLocalCollections";
import { canShare } from "@/lib/platform/detect";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";

/**
 * Local-only user actions.
 *
 * Favorites and follows are stored per-device; no account is required and no
 * personal data leaves the browser.
 */

const baseButton =
  "inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-sm transition-colors hover:bg-surface-2";

export function FavoriteButton({
  appId,
  name,
  className,
  withLabel = false,
}: {
  appId: string;
  name: string;
  className?: string;
  withLabel?: boolean;
}) {
  const favorites = useFavorites();
  const active = favorites.has(appId);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <button
      type="button"
      className={cn(baseButton, active && "border-accent/40 bg-accent-soft text-accent", className)}
      aria-pressed={mounted ? active : undefined}
      aria-label={active ? `Remove ${name} from favorites` : `Add ${name} to favorites`}
      onClick={() => {
        const next = favorites.toggle(appId);
        track(next ? "favorite_add" : "favorite_remove", { appId });
      }}
    >
      <Bookmark className={cn("h-4 w-4", active && "fill-current")} aria-hidden />
      {withLabel ? <span>{active ? "Saved" : "Favorite"}</span> : null}
    </button>
  );
}

export function FollowButton({ appId, name }: { appId: string; name: string }) {
  const watch = useWatch();
  const active = watch.has(appId);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <button
      type="button"
      className={cn(baseButton, active && "border-accent/40 bg-accent-soft text-accent")}
      aria-pressed={mounted ? active : undefined}
      aria-label={active ? `Stop following ${name}` : `Follow ${name} for new releases`}
      onClick={() => {
        const next = watch.toggle(appId);
        track(next ? "follow" : "unfollow", { appId });
      }}
    >
      <Bell className={cn("h-4 w-4", active && "fill-current")} aria-hidden />
      <span>{active ? "Following" : "Follow"}</span>
    </button>
  );
}

export function ShareButton({
  title,
  text,
  path,
}: {
  title: string;
  text?: string | null;
  path?: string;
}) {
  const [copied, setCopied] = useState(false);

  const share = useCallback(async () => {
    const url = path
      ? new URL(path, typeof window === "undefined" ? "https://omnistore.local" : window.location.origin).toString()
      : typeof window === "undefined"
        ? ""
        : window.location.href;

    track("share", { url });

    if (canShare()) {
      try {
        await navigator.share({ title, text: text ?? undefined, url });
        return;
      } catch {
        // The user dismissed the share sheet; fall through to copy.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked — nothing further we can do without nagging.
    }
  }, [path, text, title]);

  return (
    <button type="button" className={baseButton} onClick={share} aria-label={`Share ${title}`}>
      {copied ? <Check className="h-4 w-4" aria-hidden /> : copied ? null : <Share2 className="h-4 w-4" aria-hidden />}
      <span>{copied ? "Link copied" : "Share"}</span>
    </button>
  );
}

export function CompareToggle({
  appId,
  name,
  selected,
  onToggle,
  disabled,
}: {
  appId: string;
  name: string;
  selected: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(baseButton, selected && "border-accent/40 bg-accent-soft text-accent")}
      onClick={onToggle}
      disabled={disabled && !selected}
      aria-pressed={selected}
      aria-label={selected ? `Remove ${name} from comparison` : `Add ${name} to comparison`}
    >
      <GitCompare className="h-4 w-4" aria-hidden />
      <span>{selected ? "Comparing" : "Compare"}</span>
    </button>
  );
}

export function ActionRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex flex-wrap items-center gap-2", className)}>{children}</div>;
}

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={baseButton}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          /* clipboard unavailable */
        }
      }}
    >
      <Link2 className="h-4 w-4" aria-hidden />
      <span>{copied ? "Copied" : "Copy link"}</span>
    </button>
  );
}
