/**
 * Product analytics events forwarded to OmniSource's count-only analytics
 * (POST /api/v1/analytics/events). No identifiers, no cookies — OmniSource
 * stores aggregate counters only.
 */
export type AnalyticsEventType =
  | "page_view"
  | "search"
  | "app_view"
  | "download_click"
  | "collection_view"
  | "outbound_link";

export interface AnalyticsEvent {
  type: AnalyticsEventType;
  /** App slug when the event concerns an app. */
  appId?: string;
  /** Free context: query text, collection slug, target URL… */
  metadata?: Record<string, string | number | boolean | null>;
  occurredAt?: string;
}
