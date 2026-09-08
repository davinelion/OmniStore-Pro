/**
 * Transparent, deterministic scoring.
 *
 * Every number OmniStore shows is derived here from *observable upstream
 * signals* (licence, release dates, asset validation, repository activity).
 * Nothing is hand-authored or invented, and every score ships with the exact
 * factor breakdown so the UI can answer "why this score?".
 *
 * A score is a quality/maintenance signal. It is never a security guarantee,
 * and the disclaimer travels with the numbers everywhere they are rendered.
 */

import type { AssetStatus, License, ScoreFactor, Scores, Signals } from "@/lib/schemas/omnisource";

export const SCORE_ALGORITHM = {
  name: "omnisource-signals",
  version: "1.0.0",
  disclaimer:
    "Computed from public upstream signals such as licence, release recency and asset validation. It is not a security guarantee and not a malware scan.",
} as const;

export type ScoreInput = {
  license: License | null;
  openSource: boolean;
  assets: Array<{ status: AssetStatus }>;
  signals: Signals;
  metadata: {
    hasSummary: boolean;
    hasDescription: boolean;
    hasHomepage: boolean;
    hasDocumentation: boolean;
    hasIcon: boolean;
    hasFeatures: boolean;
    categoryCount: number;
    tagCount: number;
    platformCount: number;
  };
};

const DAY_MS = 86_400_000;

export function daysSince(iso: string | null | undefined, now = Date.now()): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.max(0, (now - t) / DAY_MS);
}

function factor(
  key: string,
  label: string,
  present: boolean,
  detail: string,
  points: number,
  max: number,
): ScoreFactor {
  return { key, label, present, detail, points: Math.round(points * 10) / 10, max };
}

/* ------------------------------------------------------------------ */
/* Trust — is this project what it claims to be, and is it alive?      */
/* ------------------------------------------------------------------ */

function trustFactors(input: ScoreInput, now: number): ScoreFactor[] {
  const { license, assets, signals, metadata } = input;

  // 1. Open-source licence (20)
  let licencePoints = 0;
  let licenceDetail = "No licence declared upstream.";
  let licencePresent = false;
  if (license) {
    licencePresent = true;
    licencePoints = license.osi_approved ? 20 : 10;
    licenceDetail = license.osi_approved
      ? `Distributed under ${license.name} (OSI approved).`
      : `Distributed under ${license.name}.`;
  }
  const licence = factor("open_source_license", "Open-source license", licencePresent, licenceDetail, licencePoints, 20);

  // 2. Validated assets (20)
  const total = assets.length;
  const valid = assets.filter((a) => a.status === "VALID").length;
  const validRatio = total === 0 ? 0 : valid / total;
  const assetPoints = total === 0 ? 0 : validRatio >= 0.8 ? 20 : validRatio >= 0.5 ? 12 : validRatio > 0 ? 6 : 0;
  const assets_ = factor(
    "validated_assets",
    "Validated assets",
    total > 0 && validRatio >= 0.8,
    total === 0
      ? "No release assets published upstream."
      : `${valid} of ${total} release assets pass OmniSource validation.`,
    assetPoints,
    20,
  );

  // 3. Recent releases (20)
  const sinceRelease = daysSince(signals.last_release_at, now);
  const releasePoints =
    sinceRelease === null
      ? 0
      : sinceRelease <= 30
        ? 20
        : sinceRelease <= 90
          ? 16
          : sinceRelease <= 180
            ? 12
            : sinceRelease <= 365
              ? 7
              : sinceRelease <= 730
                ? 3
                : 0;
  const release = factor(
    "recent_releases",
    "Recent releases",
    sinceRelease !== null && sinceRelease <= 365,
    sinceRelease === null
      ? "No dated release found upstream."
      : `Latest release was ${Math.round(sinceRelease)} days ago.`,
    releasePoints,
    20,
  );

  // 4. Active repository (15)
  const sincePush = daysSince(signals.repo_pushed_at, now);
  const pushPoints =
    sincePush === null
      ? 0
      : sincePush <= 7
        ? 15
        : sincePush <= 30
          ? 12
          : sincePush <= 90
            ? 9
            : sincePush <= 180
              ? 5
              : sincePush <= 365
                ? 2
                : 0;
  const active = factor(
    "active_repository",
    "Active repository",
    sincePush !== null && sincePush <= 90,
    sincePush === null
      ? "Repository activity unknown."
      : signals.archived
        ? "Repository is archived upstream."
        : `Repository last pushed ${Math.round(sincePush)} days ago.`,
    signals.archived ? 0 : pushPoints,
    15,
  );

  // 5. Established project (10) — stars as a proxy for contributor base.
  const stars = signals.stars ?? 0;
  const starPoints =
    stars >= 100_000 ? 10 : stars >= 40_000 ? 9 : stars >= 10_000 ? 8 : stars >= 2_000 ? 6 : stars >= 500 ? 4 : stars >= 50 ? 3 : 1;
  const established = factor(
    "established_contributors",
    "Established project",
    stars >= 1_000,
    `${stars.toLocaleString("en-US")} stars on the upstream repository.`,
    starPoints,
    10,
  );

  // 6. Release history (10)
  const releases = signals.release_count ?? 0;
  const releaseHistoryPoints =
    releases >= 50 ? 10 : releases >= 20 ? 8 : releases >= 10 ? 6 : releases >= 5 ? 4 : releases >= 1 ? 3 : 0;
  const history = factor(
    "release_history",
    "Release history",
    releases >= 5,
    `${releases} tagged releases published upstream.`,
    releaseHistoryPoints,
    10,
  );

  // 7. Metadata completeness (5)
  const metaHits = [
    metadata.hasSummary,
    metadata.hasDescription,
    metadata.hasHomepage,
    metadata.hasIcon,
    metadata.categoryCount > 0,
  ].filter(Boolean).length;
  const metaPoints = (metaHits / 5) * 5;
  const complete = factor(
    "metadata_completeness",
    "Metadata completeness",
    metaHits >= 4,
    `${metaHits} of 5 core metadata fields present upstream.`,
    metaPoints,
    5,
  );

  return [licence, assets_, release, active, established, history, complete];
}

/* ------------------------------------------------------------------ */
/* Quality — is this project well maintained and documented?           */
/* ------------------------------------------------------------------ */

function qualityFactors(input: ScoreInput, now: number): ScoreFactor[] {
  const { signals, metadata } = input;

  // Documentation (20)
  let docPoints = 0;
  let docDetail = "No documentation link published upstream.";
  let docPresent = false;
  if (metadata.hasDocumentation && metadata.hasDescription) {
    docPoints = 20;
    docPresent = true;
    docDetail = "Upstream publishes both documentation and a project description.";
  } else if (metadata.hasDocumentation) {
    docPoints = 14;
    docPresent = true;
    docDetail = "Upstream publishes a documentation link.";
  } else if (metadata.hasDescription) {
    docPoints = 8;
    docDetail = "Upstream publishes a description but no separate documentation link.";
  }
  const docs = factor("documentation", "Documentation", docPresent, docDetail, docPoints, 20);

  // Maintenance (20) — cadence + not archived.
  const cadence = signals.release_cadence_days;
  const sinceRelease = daysSince(signals.last_release_at, now);
  let maintenancePoints = 0;
  let maintenanceDetail = "Release cadence cannot be determined.";
  if (cadence !== null) {
    maintenancePoints = cadence <= 30 ? 20 : cadence <= 90 ? 16 : cadence <= 180 ? 11 : cadence <= 365 ? 6 : 3;
    maintenanceDetail = `Median gap between recent releases: ${Math.round(cadence)} days.`;
  }
  if (signals.archived) {
    maintenancePoints = 0;
    maintenanceDetail = "Repository is archived upstream — no further maintenance expected.";
  }
  const maintenance = factor(
    "maintenance",
    "Maintenance",
    !signals.archived && (cadence ?? 999) <= 180,
    maintenanceDetail,
    maintenancePoints,
    20,
  );

  // Release consistency (20)
  let consistencyPoints = 0;
  let consistencyDetail = "Not enough releases to measure consistency.";
  if ((signals.release_count ?? 0) >= 3) {
    consistencyPoints = cadence !== null ? (cadence <= 60 ? 20 : cadence <= 120 ? 14 : cadence <= 240 ? 8 : 4) : 10;
    consistencyDetail =
      cadence !== null
        ? `${signals.release_count} releases, averaging one every ${Math.round(cadence)} days.`
        : `${signals.release_count} releases published upstream.`;
  }
  if (sinceRelease !== null && sinceRelease > 730) {
    consistencyPoints = Math.min(consistencyPoints, 2);
  }
  const consistency = factor(
    "release_consistency",
    "Release consistency",
    consistencyPoints >= 14,
    consistencyDetail,
    consistencyPoints,
    20,
  );

  // Metadata completeness (20)
  const metaChecks = [
    metadata.hasSummary,
    metadata.hasDescription,
    metadata.hasFeatures,
    metadata.categoryCount > 0,
    metadata.tagCount >= 3,
    metadata.platformCount > 0,
  ];
  const metaHits = metaChecks.filter(Boolean).length;
  const metaPoints = (metaHits / metaChecks.length) * 20;
  const meta = factor(
    "metadata_completeness",
    "Metadata completeness",
    metaHits >= 5,
    `${metaHits} of ${metaChecks.length} descriptive fields present upstream.`,
    metaPoints,
    20,
  );

  // Community activity (20)
  const stars = signals.stars ?? 0;
  const forks = signals.forks ?? 0;
  const issues = signals.open_issues ?? 0;
  const starScore = Math.min(10, (Math.log10(stars + 1) / 5) * 10);
  const forkScore = Math.min(6, (Math.log10(forks + 1) / 3.5) * 6);
  const issueScore = issues > 0 ? Math.min(4, (Math.log10(issues + 1) / 3) * 4) : 0;
  const communityPoints = starScore + forkScore + issueScore;
  const community = factor(
    "community_activity",
    "Community activity",
    stars >= 1_000,
    `${stars.toLocaleString("en-US")} stars, ${forks.toLocaleString("en-US")} forks, ${issues.toLocaleString("en-US")} open issues upstream.`,
    communityPoints,
    20,
  );

  return [docs, maintenance, consistency, meta, community];
}

/* ------------------------------------------------------------------ */
/* Popularity                                                          */
/* ------------------------------------------------------------------ */

function popularityFactors(input: ScoreInput, now: number): ScoreFactor[] {
  const { signals } = input;
  const stars = signals.stars ?? 0;
  const forks = signals.forks ?? 0;
  const watchers = signals.watchers ?? 0;
  const sinceRelease = daysSince(signals.last_release_at, now);

  const starPoints = Math.min(60, (Math.log10(stars + 1) / 5) * 60);
  const forkPoints = Math.min(15, (Math.log10(forks + 1) / 3.5) * 15);
  const watcherPoints = Math.min(10, (Math.log10(watchers + 1) / 3) * 10);
  const recencyPoints =
    sinceRelease === null ? 0 : sinceRelease <= 90 ? 15 : sinceRelease <= 180 ? 11 : sinceRelease <= 365 ? 7 : sinceRelease <= 730 ? 3 : 0;

  return [
    factor("stars", "Stars", stars > 0, `${stars.toLocaleString("en-US")} stars upstream.`, starPoints, 60),
    factor("forks", "Forks", forks > 0, `${forks.toLocaleString("en-US")} forks upstream.`, forkPoints, 15),
    factor("watchers", "Watchers", watchers > 0, `${watchers.toLocaleString("en-US")} watchers upstream.`, watcherPoints, 10),
    factor(
      "release_recency",
      "Release recency",
      sinceRelease !== null && sinceRelease <= 180,
      sinceRelease === null ? "No dated release upstream." : `Latest release ${Math.round(sinceRelease)} days ago.`,
      recencyPoints,
      15,
    ),
  ];
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

function sum(factors: ScoreFactor[]): number {
  return Math.max(0, Math.min(100, Math.round(factors.reduce((acc, f) => acc + f.points, 0))));
}

export function computeScores(input: ScoreInput, now = Date.now()): Scores {
  const trust = trustFactors(input, now);
  const quality = qualityFactors(input, now);
  const popularity = popularityFactors(input, now);

  return {
    trust: { value: sum(trust), factors: trust },
    quality: { value: sum(quality), factors: quality },
    popularity: { value: sum(popularity), factors: popularity },
    algorithm: {
      name: SCORE_ALGORITHM.name,
      version: SCORE_ALGORITHM.version,
      computed_at: new Date(now).toISOString(),
      disclaimer: SCORE_ALGORITHM.disclaimer,
    },
  };
}

/** Compact label used by cards, e.g. "Trust 92". */
export function scoreLabel(value: number | null): string {
  return value === null ? "Not available" : String(value);
}
