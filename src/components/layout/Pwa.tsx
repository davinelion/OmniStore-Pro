"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

import { flags } from "@/config/flags";

/**
 * PWA runtime.
 *
 * Registers the service worker, reports connectivity, and shows honest offline
 * messaging. Install prompts are left to the browser — OmniStore does not nag.
 */
export function Pwa() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (!flags.pwa) return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-16 z-30 mx-auto flex max-w-content items-center justify-center gap-2 px-4"
    >
      <p className="flex items-center gap-2 rounded-full border border-warning/40 bg-warning/10 px-4 py-2 text-sm text-warning">
        <WifiOff className="h-4 w-4" aria-hidden />
        You appear to be offline. Showing cached information when possible.
      </p>
    </div>
  );
}
