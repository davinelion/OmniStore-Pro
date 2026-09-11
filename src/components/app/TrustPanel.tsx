"use client";

import { useTranslations } from "next-intl";

import type { TrustReport } from "@omnistore/shared-models";
import { TrustBadgeList } from "./TrustBadges";
import { ScoreRing } from "./ScoreRing";

const FACTOR_LABELS: Record<string, string> = {
  license_clarity: "License clarity",
  open_source: "Open source",
  repository_activity: "Repository activity",
  release_consistency: "Release consistency",
  contributor_diversity: "Contributor diversity",
  issue_activity: "Issue activity",
  documentation: "Documentation",
  asset_validation: "Asset validation",
  metadata_quality: "Metadata quality",
  security: "Security",
  maintenance: "Maintenance",
};

/**
 * Trust panel — renders OmniSource's factor breakdown verbatim.
 * The score and badges are upstream output; this UI only explains them.
 */
export function TrustPanel({ report }: { report: TrustReport | null }) {
  const t = useTranslations("trust");
  if (!report) return null;

  const factors = Object.entries(report.factors)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);

  return (
    <div className="card space-y-4 p-4">
      <div className="flex items-center gap-4">
        <ScoreRing value={report.score} label={t("verified")} max={100} />
        <div className="min-w-0 flex-1 space-y-2">
          <h2 className="text-sm font-semibold">{t("factors")}</h2>
          <TrustBadgeList badges={report.badges} />
        </div>
      </div>
      {factors.length > 0 ? (
        <ul className="space-y-2">
          {factors.map(([factor, value]) => (
            <li key={factor}>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">{FACTOR_LABELS[factor] ?? factor}</span>
                <span className="tabular-nums text-subtle">{Math.round(value * 100)}%</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-3">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="text-2xs leading-relaxed text-subtle">{t("trustedDescription")}</p>
    </div>
  );
}
