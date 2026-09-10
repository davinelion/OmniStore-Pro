"use client";
import { useEffect, useState } from "react";
import { site } from "@/config/site";
export function AnalyticsConsent() {
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    try {
      setEnabled(localStorage.getItem("omnistore:analytics-consent") === "yes");
    } catch {
      /* storage unavailable */
    }
  }, []);
  if (!site.analyticsEnabled)
    return (
      <p className="text-sm text-muted">
        Product analytics are disabled on this deployment.
      </p>
    );
  return (
    <div className="space-y-2">
      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            try {
              localStorage.setItem(
                "omnistore:analytics-consent",
                e.target.checked ? "yes" : "no",
              );
              setEnabled(e.target.checked);
              setMessage("");
            } catch {
              setMessage("Unable to save consent; analytics remain off.");
            }
          }}
        />
        Allow anonymous event counts to help improve OmniStore
      </label>
      <p className="text-sm text-muted">
        Off until you opt in. No search text, app IDs, URLs, notes, or error
        details are sent. Do Not Track overrides this setting. Hosting providers
        may independently log ordinary HTTP requests.
      </p>
      <p role="status">{message}</p>
    </div>
  );
}
