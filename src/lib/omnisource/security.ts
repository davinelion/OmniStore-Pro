/**
 * Security endpoint group — GET /api/v1/security/{id}.
 *
 * Scan evidence, hash verification, release validation and risk scoring are
 * produced by OmniSource's security engine. The dashboard renders evidence;
 * it never computes a verdict.
 */

import {
  SecurityResponseSchema,
  mapSecurity,
  countVulnerabilities,
  riskLevel,
  type RiskLevel,
  type SecurityReport,
} from "@omnistore/shared-models";
import type { OmniSourceClient, RequestOptions } from "./client";

export class SecurityApi {
  constructor(private readonly client: OmniSourceClient) {}

  /** Full security report incl. per-scan evidence. */
  async get(id: string, options: RequestOptions = {}): Promise<SecurityReport | null> {
    try {
      const dto = await this.client.request(
        `/security/${encodeURIComponent(id)}`,
        SecurityResponseSchema,
        { tags: ["security", `app:${id}`], revalidate: 600, ...options },
      );
      return mapSecurity(dto);
    } catch {
      return null;
    }
  }

  /** Convenience aggregate used by cards and badges. */
  async summary(id: string, options: RequestOptions = {}) {
    const report = await this.get(id, options);
    if (!report) return null;
    return {
      ...report,
      vulnerabilityCount: countVulnerabilities(report),
      level: riskLevel(report) as RiskLevel,
    };
  }
}
