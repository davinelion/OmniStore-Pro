"use client";

import { ShieldAlert, ShieldCheck, ShieldMinus, ShieldQuestion } from "lucide-react";
import { useTranslations } from "next-intl";

import type { SecurityReport } from "@omnistore/shared-models";
import { cn } from "@/lib/utils";

/**
 * Compact security state badge driven by OmniSource's security report.
 * "not_scanned" is always shown honestly — never rendered as "safe".
 */
export function SecurityBadge({
  report,
  className,
}: {
  report: Pick<SecurityReport, "securityScore" | "riskScore" | "status"> | null;
  className?: string;
}) {
  const t = useTranslations("security");
  if (!report) return null;

  const status = report.status;
  const tone =
    status === "passed"
      ? { classes: "border-success/40 bg-success/10 text-success", icon: ShieldCheck, label: t("passed") }
      : status === "flagged"
        ? { classes: "border-danger/40 bg-danger/10 text-danger", icon: ShieldAlert, label: t("flagged") }
        : status === "not_scanned"
          ? { classes: "border-line bg-surface-2 text-muted", icon: ShieldQuestion, label: t("notScanned") }
          : { classes: "border-warning/40 bg-warning/10 text-warning", icon: ShieldMinus, label: t("reviewRequired") };
  const Icon = tone.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        tone.classes,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {tone.label}
      <span className="tabular-nums opacity-80">· {report.securityScore}</span>
    </span>
  );
}
