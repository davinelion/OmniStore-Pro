import type { Platform } from "@/lib/schemas/omnisource";

/**
 * Best-effort client platform detection.
 *
 * Used only to pre-select a sensible default in the download panel; the user
 * always sees every platform and can change it. We never hide platforms based
 * on a guess.
 */

type NavigatorUAData = { platform?: string; brands?: Array<{ brand: string }> };

function uaData(): NavigatorUAData | undefined {
  if (typeof navigator === "undefined") return undefined;
  return (navigator as Navigator & { userAgentData?: NavigatorUAData }).userAgentData;
}

export function detectPlatform(): Platform | null {
  if (typeof navigator === "undefined") return null;

  const data = uaData();
  const source = `${data?.platform ?? ""} ${navigator.userAgent ?? ""}`.toLowerCase();
  if (!source.trim()) return null;

  if (/android/.test(source)) return "android";
  if (/iphone|ipad|ipod|ios/.test(source)) {
    // iPadOS reports as macOS in some browsers; tablet hint wins when present.
    if (/ipad/.test(source) || (navigator.maxTouchPoints > 1 && /macintosh/.test(data?.platform ?? ""))) {
      return "ipados";
    }
    return "ios";
  }
  if (/win/.test(source)) return "windows";
  if (/mac/.test(source)) return "macos";
  if (/linux|x11|freebsd|openbsd/.test(source)) return "linux";

  return null;
}

export function detectArchitecture(): "arm64" | "x86_64" | null {
  const data = uaData();
  const hint = `${data?.platform ?? ""} ${navigator.userAgent ?? ""}`.toLowerCase();
  if (/arm|aarch64|apple/.test(hint)) return "arm64";
  if (/x86_64|x64|win64|wow64/.test(hint)) return "x86_64";
  return null;
}

/** True when the Web Share API can actually be used for this payload. */
export function canShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}
