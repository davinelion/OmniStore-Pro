"use client";

import type { AnalyticsEvent } from "@omnistore/shared-models";

/** Consent-gated, count-only events. Never blocks navigation or rendering. */
export function trackEvent(event: AnalyticsEvent): void {
  if (typeof window === "undefined" || window.localStorage.getItem("omnistore:analytics-consent") !== "yes" || navigator.doNotTrack === "1") return;
  void fetch("/api/v1/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    keepalive: true,
    body: JSON.stringify({ events: [{ ...event, occurredAt: new Date().toISOString() }] }),
  }).catch(() => {
    // Analytics are best effort and never affect the product path.
  });
}
