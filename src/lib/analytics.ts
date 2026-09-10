/**
 * Privacy-conscious, opt-in analytics.
 *
 * Disabled unless `NEXT_PUBLIC_ENABLE_ANALYTICS=true`. When enabled it emits
 * anonymous, aggregated product events only — no identifiers, no cookies, no
 * personal data, no cross-site tracking.
 */

import { site } from "@/config/site";

export type AnalyticsEvent =
  | "app_view"
  | "search"
  | "download_click"
  | "platform_filter"
  | "category_view"
  | "compare_add"
  | "favorite_add"
  | "favorite_remove"
  | "follow"
  | "unfollow"
  | "share"
  | "report_submit"
  | "route_error";

type Payload = Record<string, string | number | boolean | undefined>;

export function analyticsEnabled(): boolean {
  return site.analyticsEnabled;
}

export function track(event: AnalyticsEvent, payload: Payload = {}): void {
  if (!site.analyticsEnabled) return;
  if (typeof window === "undefined") return;

  // Both deployment opt-in and a visitor's explicit consent are required.
  // Payload is deliberately discarded: search terms and IDs must not leave here.
  void payload;
  try {
    if (navigator.doNotTrack === "1" || localStorage.getItem("omnistore:analytics-consent") !== "yes") return;
    void fetch("/api/v1/events", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ event }), keepalive: true }).catch(() => undefined);
  } catch { /* Analytics must never interrupt browsing. */ }
}

/** Fires an app_view event safely from a client component. */
export function trackAppView(appId: string): void {
  track("app_view", { appId });
}
