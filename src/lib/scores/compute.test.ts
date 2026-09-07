import { describe, expect, it } from "vitest";

import { SCORE_ALGORITHM, computeScores, daysSince, scoreLabel } from "./compute";
import type { ScoreInput } from "./compute";

/**
 * Scores must be explainable, deterministic and honest about missing data.
 * They are signals, never security guarantees.
 */

const NOW = Date.parse("2026-09-08T00:00:00Z");
const iso = (daysAgo: number) => new Date(NOW - daysAgo * 86_400_000).toISOString();

function input(overrides: Partial<ScoreInput> = {}): ScoreInput {
  return {
    license: { id: "GPL-3.0", name: "GNU GPL v3", url: null, osi_approved: true },
    openSource: true,
    assets: [
      { status: "VALID" },
      { status: "VALID" },
      { status: "VALID" },
    ],
    signals: {
      stars: 8_000,
      forks: 500,
      open_issues: 120,
      watchers: 300,
      repo_created_at: iso(1800),
      repo_pushed_at: iso(5),
      release_count: 24,
      first_release_at: iso(1400),
      last_release_at: iso(20),
      release_cadence_days: null,
      archived: false,
    },
    metadata: {
      hasSummary: true,
      hasDescription: true,
      hasHomepage: true,
      hasDocumentation: true,
      hasIcon: true,
      hasFeatures: true,
      categoryCount: 2,
      tagCount: 6,
      platformCount: 3,
    },
    ...overrides,
  };
}

function shape(overrides: Partial<ScoreInput> = {}): ScoreInput {
  return input(overrides);
}

function withSignals(signals: Partial<ScoreInput["signals"]>): ScoreInput {
  return input({ signals: { ...input().signals, ...signals } });
}

function withMetadata(metadata: Partial<ScoreInput["metadata"]>): ScoreInput {
  return input({ metadata: { ...input().metadata, ...metadata } });
}

describe("daysSince", () => {
  it("returns null for missing dates", () => {
    expect(daysSince(null, NOW)).toBeNull();
    expect(daysSince(undefined, NOW)).toBeNull();
    expect(daysSince("not-a-date", NOW)).toBeNull();
  });

  it("never returns a negative age", () => {
    expect(daysSince(new Date(NOW + 86_400_000).toISOString(), NOW)).toBe(0);
  });
});

describe("computeScores", () => {
  it("is deterministic", () => {
    const a = JSON.stringify(computeScores(input(), NOW));
    const b = JSON.stringify(computeScores(input(), NOW));
    expect(a).toBe(b);
  });

  it("stays within 0-100 for every input shape", () => {
    const shapes: ScoreInput[] = [
      input(),
      withSignals({ stars: 0, forks: 0, open_issues: 0, watchers: 0, release_count: 0 }),
      withSignals({ stars: 500_000, forks: 90_000, open_issues: 40_000, watchers: 30_000, release_count: 900 }),
      shape({ license: null, openSource: false }),
      withSignals({ archived: true, last_release_at: null, repo_pushed_at: null, release_count: 0 }),
      (() => {
        const empty = withSignals({
          stars: null,
          forks: null,
          open_issues: null,
          watchers: null,
          release_count: null,
          repo_created_at: null,
          repo_pushed_at: null,
          first_release_at: null,
          last_release_at: null,
          archived: null,
        });
        return {
          ...empty,
          license: null,
          assets: [{ status: "UNKNOWN" }],
          metadata: {
            hasSummary: false,
            hasDescription: false,
            hasHomepage: false,
            hasDocumentation: false,
            hasIcon: false,
            hasFeatures: false,
            categoryCount: 0,
            tagCount: 0,
            platformCount: 0,
          },
        };
      })(),
    ];

    for (const shape of shapes) {
      const scores = computeScores(shape, NOW);
      for (const value of [scores.trust.value, scores.quality.value, scores.popularity.value]) {
        expect(value).not.toBeNull();
        expect(value!).toBeGreaterThanOrEqual(0);
        expect(value!).toBeLessThanOrEqual(100);
      }
    }
  });

  it("always publishes the algorithm identity and disclaimer", () => {
    const scores = computeScores(input(), NOW);
    expect(scores.algorithm.name).toBe(SCORE_ALGORITHM.name);
    expect(scores.algorithm.version).toBe(SCORE_ALGORITHM.version);
    expect(scores.algorithm.disclaimer).toMatch(/not a security/i);
  });

  it("scores a healthy, actively released project above an abandoned one", () => {
    const healthy = computeScores(input(), NOW);
    const abandoned = computeScores(
      {
        ...withSignals({
          archived: true,
          last_release_at: iso(1500),
          repo_pushed_at: iso(1500),
          release_count: 1,
        }),
        license: null,
        assets: [{ status: "INVALID" }],
        metadata: {
          hasSummary: false,
          hasDescription: false,
          hasHomepage: false,
          hasDocumentation: false,
          hasIcon: false,
          hasFeatures: false,
          categoryCount: 0,
          tagCount: 0,
          platformCount: 0,
        },
      },
      NOW,
    );
    expect(healthy.trust.value!).toBeGreaterThan(abandoned.trust.value!);
    expect(healthy.quality.value!).toBeGreaterThan(abandoned.quality.value!);
  });

  it("exposes every contributing factor with points, max and a plain-language reason", () => {
    const scores = computeScores(input(), NOW);
    for (const score of [scores.trust, scores.quality, scores.popularity]) {
      expect(score.factors.length).toBeGreaterThan(0);
      for (const factor of score.factors) {
        expect(factor.label.length).toBeGreaterThan(0);
        expect(factor.detail.length).toBeGreaterThan(0);
        expect(factor.points).toBeLessThanOrEqual(factor.max);
        expect(factor.points).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("reports missing signals as absent rather than zero-credit facts", () => {
    const scores = computeScores(withSignals({ last_release_at: null, release_count: null }), NOW);
    const factors = [...scores.trust.factors, ...scores.quality.factors, ...scores.popularity.factors];
    const absent = factors.filter((factor) => !factor.present);
    expect(absent.length).toBeGreaterThan(0);
    for (const factor of absent) {
      expect(factor.points).toBe(0);
      expect(factor.present).toBe(false);
      // Absence is stated as absence, never silently scored as a bad result.
      expect(factor.detail.length).toBeGreaterThan(0);
    }
    const recency = [...scores.trust.factors, ...scores.quality.factors].find(
      (factor) => factor.key === "recent_releases",
    );
    expect(recency?.present).toBe(false);
    expect(recency?.detail).toMatch(/no|not|0|cannot/i);
  });

  it("does not fabricate a security claim for unverified assets", () => {
    const scores = computeScores(shape({ assets: [{ status: "UNKNOWN" }] }), NOW);
    const factor = scores.trust.factors.find((f) => /verif|valid/i.test(f.label));
    expect(factor?.present).toBe(false);
  });

  it("labels score bands", () => {
    expect(scoreLabel(90)).toBeTruthy();
    expect(scoreLabel(null)).toBeTruthy();
    expect(scoreLabel(null)).toMatch(/not/i);
  });
});
