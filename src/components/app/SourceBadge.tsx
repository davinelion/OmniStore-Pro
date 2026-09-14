import { Boxes, GitBranch, Github, Gitlab, Package, Terminal } from "lucide-react";

import { SOURCE_LABELS, type SourceId } from "@/lib/sources";
import { cn } from "@/lib/utils";

/** Icon per upstream. Package managers get a package glyph, forges a git glyph. */
const ICONS: Record<SourceId, typeof Github> = {
  github: Github,
  gitlab: Gitlab,
  codeberg: GitBranch,
  forgejo: GitBranch,
  fdroid: Package,
  flathub: Boxes,
  winget: Package,
  homebrew: Terminal,
  other: GitBranch,
};

/**
 * Where this app's releases come from.
 *
 * Obtainium's whole premise is that the source is visible and verifiable, so
 * the upstream is surfaced on every card — not buried on the detail page.
 */
export function SourceBadge({
  source,
  className,
  showLabel = true,
}: {
  source: string;
  className?: string;
  showLabel?: boolean;
}) {
  const id = (source in ICONS ? source : "other") as SourceId;
  const Icon = ICONS[id];
  const label = SOURCE_LABELS[id];

  return (
    <span className={cn("chip", className)} title={label}>
      <Icon className="h-3 w-3" aria-hidden />
      {showLabel ? label : <span className="sr-only">{label}</span>}
    </span>
  );
}
