"use client";

import { BadgeCheck, FlaskConical, Archive, ShieldCheck, Users, Star } from "lucide-react";

import type { TrustBadge } from "@omnistore/shared-models";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/**
 * Trust badges. The *calculation* lives in OmniSource; this component only
 * renders the badge set the API returned. Six badge types, one component.
 */

const BADGE_STYLE: Record<TrustBadge, { icon: typeof BadgeCheck; classes: string }> = {
  verified: { icon: BadgeCheck, classes: "border-success/40 bg-success/10 text-success" },
  trusted: { icon: Star, classes: "border-accent/40 bg-accent-soft text-accent" },
  security_audited: { icon: ShieldCheck, classes: "border-info/40 bg-info/10 text-info" },
  community_verified: { icon: Users, classes: "border-info/30 bg-info/10 text-info" },
  experimental: { icon: FlaskConical, classes: "border-warning/40 bg-warning/10 text-warning" },
  deprecated: { icon: Archive, classes: "border-danger/40 bg-danger/10 text-danger" },
};

const BADGE_KEY: Record<TrustBadge, string> = {
  verified: "verified",
  trusted: "trusted",
  security_audited: "securityAudited",
  community_verified: "communityVerified",
  experimental: "experimental",
  deprecated: "deprecated",
};

/** Display order: earned/stable badges first, caveats last. */
const DISPLAY_ORDER: TrustBadge[] = [
  "verified",
  "trusted",
  "security_audited",
  "community_verified",
  "experimental",
  "deprecated",
];

export function TrustBadgeList({
  badges,
  size = "md",
  className,
}: {
  badges: readonly TrustBadge[];
  size?: "sm" | "md";
  className?: string;
}) {
  const t = useTranslations("trust");
  const ordered = [...badges].sort(
    (a, b) => DISPLAY_ORDER.indexOf(a) - DISPLAY_ORDER.indexOf(b),
  );
  if (ordered.length === 0) return null;

  return (
    <ul className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {ordered.map((badge) => {
        const { icon: Icon, classes } = BADGE_STYLE[badge];
        return (
          <li key={badge}>
            <span
              title={t(`${BADGE_KEY[badge]}Description`)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium",
                size === "sm" ? "text-2xs" : "text-xs",
                classes,
              )}
            >
              <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} aria-hidden />
              {t(BADGE_KEY[badge])}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function TrustBadge({ badge }: { badge: TrustBadge }) {
  return <TrustBadgeList badges={[badge]} />;
}
