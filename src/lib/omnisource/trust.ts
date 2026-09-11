/**
 * Trust endpoint group — GET /api/v1/trust/{id}.
 *
 * Trust scores, factor breakdowns and badges are computed exclusively inside
 * OmniSource. The frontend only renders what it receives and links to the
 * evidence. No trust logic exists client-side.
 */

import {
  TrustResponseSchema,
  mapTrust,
  type TrustReport,
} from "@omnistore/shared-models";
import type { OmniSourceClient, RequestOptions } from "./client";

export class TrustApi {
  constructor(private readonly client: OmniSourceClient) {}

  /** Transparent trust report with factor breakdown and derived badges. */
  async get(id: string, options: RequestOptions = {}): Promise<TrustReport | null> {
    try {
      const dto = await this.client.request(
        `/trust/${encodeURIComponent(id)}`,
        TrustResponseSchema,
        { tags: ["trust", `app:${id}`], revalidate: 600, ...options },
      );
      return mapTrust(dto);
    } catch {
      return null;
    }
  }
}
