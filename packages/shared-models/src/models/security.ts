/**
 * Security model. Evidence is produced by OmniSource's security engine
 * (artifact validation, hash verification, scanners). Clients render it;
 * they never score security themselves.
 */

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type SecurityScanStatus =
  | "passed"
  | "flagged"
  | "review_required"
  | "not_scanned"
  | string;

export interface SecurityScanEvidence {
  type: string;
  status: SecurityScanStatus;
  severity: string | null;
  confidence: number | null;
  findings: unknown[];
  vulnerabilities: unknown[];
  scannedAt: string | null;
  scannerVersion: string | null;
}

export interface SecurityReport {
  appId: string;
  /** 0–100. 0 with status "not_scanned" means no evidence exists yet. */
  securityScore: number;
  riskScore: number;
  /** Aggregate: "passed" | "review_required" | "flagged" | "not_scanned". */
  status: string;
  latestScannedAt: string | null;
  scans: SecurityScanEvidence[];
}

/** Vulnerability count derived from scan evidence (sum across scans). */
export function countVulnerabilities(report: SecurityReport): number {
  return report.scans.reduce((sum, scan) => sum + (scan.vulnerabilities?.length ?? 0), 0);
}

export function riskLevel(report: SecurityReport): RiskLevel {
  const risk = report.riskScore;
  if (risk >= 60) return "critical";
  if (risk >= 35) return "high";
  if (risk >= 15) return "medium";
  return "low";
}
