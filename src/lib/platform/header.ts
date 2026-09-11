import { headers } from "next/headers";
import type { Platform } from "@omnistore/shared-models";

/**
 * Server-side platform hint from the User-Agent. Only used to pre-select a
 * download tab; every platform stays visible and user-selectable.
 */
export async function detectPlatformHeader(): Promise<Platform | null> {
  const headerList = await headers();
  const ua = (headerList.get("user-agent") ?? "").toLowerCase();
  if (!ua) return null;
  if (/iphone|ipod/.test(ua)) return "ios";
  if (/ipad/.test(ua) || (/macintosh/.test(ua) && /mobile/.test(ua))) return "ipados";
  if (/android/.test(ua)) return "android";
  if (/windows/.test(ua)) return "windows";
  if (/macintosh|mac os x/.test(ua)) return "macos";
  if (/linux|x11/.test(ua)) return "linux";
  return null;
}
