"use client";

import { useTranslations } from "next-intl";
import { FileSearch, Hash, PackageCheck, ScanSearch } from "lucide-react";

import type { SecurityReport } from "@omnistore/shared-models";
import { countVulnerabilities, riskLevel } from "@omnistore/shared-models";
import { formatDateTime } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { ScoreRing } from "./ScoreRing";

/**
 * Security dashboard (Phase 11) — every number and every row of evidence
 * comes from OmniSource's security engine via /api/v1/security/{id}.
 */
export function SecurityDashboard({ report }: { report: SecurityReport | null }) {
  const t = useTranslations("security");
  if (!report) {
    return (
      <div className="card p-5">
        <h2 className="text-sm font-semibold">{t("title")}</h2>
        <p className="mt-2 text-sm text-muted">{t("empty")}</p>
      </div>
    );
  }

  const level = riskLevel(report);
  const vulns = countVulnerabilities(report);
  const levelLabel = t(
    level === "critical" ? "riskCritical" : level === "high" ? "riskHigh" : level === "medium" ? "riskMedium" : "riskLow",
  );
  const statusLabel =
    report.status === "passed"
      ? t("passed")
      : report.status === "flagged"
        ? t("flagged")
        : report.status === "not_scanned"
          ? t("notScanned")
          : t("reviewRequired");

  const hashScans = report.scans.filter((scan) => scan.type.includes("hash") || scan.type.includes("static"));
  const hashOk = hashScans.every((scan) => scan.status === "passed") && hashScans.length > 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card flex items-center gap-4 p-4">
          <ScoreRing value={report.securityScore} />
          <div>
            <p className="text-xs text-muted">{t("score")}</p>
            <p className="text-sm font-semibold">{statusLabel}</p>
            <p className="mt-0.5 text-2xs text-subtle">
              {report.latestScannedAt ? `${t("latestScan")}: ${formatDateTime(report.latestScannedAt)}` : t("notScanned")}
            </p>
          </div>
        </div>
        <div className="card flex items-center gap-4 p-4">
          <span
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-bold",
              level === "critical" || level === "high"
                ? "bg-danger/10 text-danger"
                : level === "medium"
                  ? "bg-warning/10 text-warning"
                  : "bg-success/10 text-success",
            )}
          >
            {levelLabel.charAt(0)}
          </span>
          <div>
            <p className="text-xs text-muted">{t("risk")}</p>
            <p className="text-sm font-semibold">{levelLabel}</p>
            <p className="mt-0.5 text-2xs text-subtle tabular-nums">risk {report.riskScore}/100</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 p-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-info/10 text-info">
            <Hash className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-xs text-muted">{t("hashVerification")}</p>
            <p className="text-sm font-semibold">{hashOk ? t("passed") : t("reviewRequired")}</p>
            <p className="mt-0.5 text-2xs text-subtle">{report.scans.length} checks</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 p-4">
          <span
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-2xl",
              vulns > 0 ? "bg-danger/10 text-danger" : "bg-success/10 text-success",
            )}
          >
            <ScanSearch className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-xs text-muted">{t("vulnerabilities")}</p>
            <p className="text-sm font-semibold tabular-nums">{vulns}</p>
            <p className="mt-0.5 text-2xs text-subtle">{t("releaseValidation")}</p>
          </div>
        </div>
      </div>

      <div className="card p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <FileSearch className="h-4 w-4 text-muted" aria-hidden />
          {t("scans")}
        </h3>
        <ul className="mt-3 divide-y divide-line">
          {report.scans.map((scan, index) => (
            <li key={`${scan.type}-${index}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-2xs font-medium",
                  scan.status === "passed"
                    ? "border-success/30 bg-success/10 text-success"
                    : scan.status === "flagged"
                      ? "border-danger/30 bg-danger/10 text-danger"
                      : "border-warning/30 bg-warning/10 text-warning",
                )}
              >
                {scan.status === "passed"
                  ? t("passed")
                  : scan.status === "flagged"
                    ? t("flagged")
                    : t("reviewRequired")}
              </span>
              <span className="text-xs font-medium">{scan.type}</span>
              {scan.severity ? (
                <span className="text-2xs uppercase text-subtle">{scan.severity}</span>
              ) : null}
              <span className="text-2xs text-subtle">
                {scan.scannedAt ? formatDateTime(scan.scannedAt) : ""}
              </span>
              <span className="ms-auto text-2xs text-subtle tabular-nums">
                {(scan.findings?.length ?? 0) > 0
                  ? `${scan.findings.length} findings`
                  : t("noFindings")}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 border-t border-line pt-3 text-2xs leading-relaxed text-subtle">
          {t("disclaimer")}
        </p>
      </div>
    </div>
  );
}
