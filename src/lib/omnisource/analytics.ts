/**
 * Analytics endpoint group — POST /api/v1/analytics/events.
 *
 * Opt-in, count-only product analytics. OmniStore batches events in the
 * browser and forwards them to OmniSource, which stores aggregate counters.
 * No identifiers, no cookies, no third parties. Disabled unless the visitor
 * consents (see src/lib/analytics in the web app).
 */

import type { AnalyticsEvent } from "@omnistore/shared-models";
import { z } from "zod";
import type { OmniSourceClient, RequestOptions } from "./client";

const AckSchema = z.object({}).passthrough().optional();

export class AnalyticsApi {
  private queue: AnalyticsEvent[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly client: OmniSourceClient) {}

  /** Queue an event; flushed in batches to keep requests cheap. */
  track(event: AnalyticsEvent): void {
    this.queue.push({ occurredAt: new Date().toISOString(), ...event });
    if (typeof window === "undefined") {
      // Server: send immediately, never block rendering on failure.
      void this.flush().catch(() => {});
      return;
    }
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush().catch(() => {});
    }, 2000);
  }

  async flush(options: RequestOptions = {}): Promise<void> {
    const batch = this.queue;
    this.queue = [];
    if (batch.length === 0) return;
    await this.client.request(
      "/analytics/events",
      AckSchema,
      { method: "POST", body: { events: batch }, retries: 0, ...options },
    );
  }
}
