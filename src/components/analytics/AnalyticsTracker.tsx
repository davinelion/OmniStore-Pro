"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics/client";

export function AnalyticsTracker({ type, appId, collection }: { type: "app_view" | "collection_view"; appId?: string; collection?: string }) {
  useEffect(() => {
    trackEvent({ type, ...(appId ? { appId } : {}), metadata: collection ? { collection } : undefined });
  }, [appId, collection, type]);
  return null;
}
