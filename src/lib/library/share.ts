/**
 * Share links for user collections.
 *
 * A shared collection is encoded as base64url JSON in the URL query:
 * /collections/mine?import=<payload>. No server storage — the link itself
 * carries the data, and importing copies it into the importer's local
 * library.
 */

import type { UserCollection } from "./types";

export interface SharePayload {
  name: string;
  description?: string;
  appIds: string[];
}

export function encodeShare(collection: Pick<UserCollection, "name" | "description" | "appIds">): string {
  const payload: SharePayload = {
    name: collection.name,
    description: collection.description,
    appIds: collection.appIds,
  };
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeShare(encoded: string): SharePayload | null {
  try {
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as SharePayload).name === "string" &&
      Array.isArray((parsed as SharePayload).appIds) &&
      (parsed as SharePayload).appIds.every((id) => typeof id === "string") &&
      (parsed as SharePayload).appIds.length <= 100
    ) {
      return parsed as SharePayload;
    }
    return null;
  } catch {
    return null;
  }
}

export function shareUrl(collection: Pick<UserCollection, "name" | "description" | "appIds">): string {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/collections/mine?import=${encodeShare(collection)}`;
}
