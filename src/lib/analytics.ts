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
  | "report_submit";

type Payload = Record<string, string | number | boolean | undefined>;

export function analyticsEnabled(): boolean {
  return site.analyticsEnabled;
}

export function track(event: AnalyticsEvent, payload: Payload = {}): void {
  if (!site.analyticsEnabled) return;
  if (typeof window === "undefined") return;

  // Structured console output is the default sink: deployers can forward it to
  // any privacy-respecting collector without adding third-party scripts.
  try {
    // eslint-disable-next-line no-console
    console.debug("[omnistore:analytics]", event, payload);
  } catch {
    /* console unavailable */
  }
}

/** Fires an app_view event safely from a client component. */
export function trackAppView(appId: string): void {
  track("app_view", { appId });
}
