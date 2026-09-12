"use client";

import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { useEffect } from "react";

/**
 * Production observability. Vercel's privacy-conscious components are always
 * safe to render; PostHog is loaded only when configured and after the same
 * explicit analytics consent used by OmniStore's event client.
 */
export function Observability() {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    let consent = false;
    try {
      consent = localStorage.getItem("omnistore:analytics-consent") === "yes";
    } catch {
      consent = false;
    }
    if (!key || !consent || navigator.doNotTrack === "1") return;
    if (document.querySelector("script[data-omnistore-posthog]")) return;
    const script = document.createElement("script");
    script.src = `${process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com"}/static/array.js`;
    script.async = true;
    script.dataset.omnistorePosthog = "true";
    script.onload = () => {
      const posthog = (window as unknown as { posthog?: { init: (token: string, options: Record<string, unknown>) => void } }).posthog;
      posthog?.init(key, { api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com", capture_pageview: true, persistence: "memory" });
    };
    document.head.appendChild(script);
  }, []);

  return <><Analytics /><SpeedInsights /></>;
}
