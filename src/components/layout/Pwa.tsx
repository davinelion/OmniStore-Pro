"use client";
import { useEffect } from "react";
import { flags } from "@/config/flags";

export function Pwa() {
  useEffect(() => {
    if (!flags.pwa) return;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
