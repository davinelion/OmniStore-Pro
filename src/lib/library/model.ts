import { z } from "zod";
import type { App, Platform } from "@/lib/schemas/omnisource";

export const EntrySchema = z.object({
  appId: z.string().min(1).max(200),
  note: z.string().max(1000).default(""),
});
export const PersonalListSchema = z
  .object({
    id: z.string().min(1).max(100),
    name: z.string().trim().min(1).max(80),
    entries: z.array(EntrySchema).max(200),
  })
  .refine(
    (list) =>
      new Set(list.entries.map((e) => e.appId)).size === list.entries.length,
    "Duplicate apps",
  );
export const LibrarySchema = z
  .object({
    version: z.literal(1),
    lists: z.array(PersonalListSchema).max(50),
  })
  .refine(
    (data) =>
      new Set(data.lists.map((list) => list.id)).size === data.lists.length,
    "Duplicate lists",
  );
export type PersonalList = z.infer<typeof PersonalListSchema>;
export type Library = z.infer<typeof LibrarySchema>;
export const EMPTY_LIBRARY: Library = { version: 1, lists: [] };
export const MAX_BACKUP_BYTES = 1024 * 1024;
export function parseLibrary(text: string): Library {
  if (new TextEncoder().encode(text).length > MAX_BACKUP_BYTES)
    throw new Error("Backup exceeds 1 MB.");
  return LibrarySchema.parse(JSON.parse(text));
}
// Sharing is explicit and excludes private notes. Fragments do not go to the server.
export function shareList(list: PersonalList): string {
  const publicList = {
    ...list,
    entries: list.entries.map((e) => ({ appId: e.appId, note: "" })),
  };
  const encoded = encodeURIComponent(
    JSON.stringify(PersonalListSchema.parse(publicList)),
  );
  if (encoded.length > 12000)
    throw new Error("This list is too large for a link. Export it instead.");
  return encoded;
}
export function parseSharedList(fragment: string): PersonalList {
  if (fragment.length > 12000) throw new Error("Shared list is too large.");
  return PersonalListSchema.parse(JSON.parse(decodeURIComponent(fragment)));
}
export function releaseKey(appId: string, releaseId: string) {
  return JSON.stringify([appId, releaseId]);
}
export function updateItems(
  apps: App[],
  preferences: { prereleases: boolean; platform: Platform | "all" },
) {
  return apps
    .flatMap((app) => {
      const releases = [...app.releases];
      if (
        app.latest_release &&
        !releases.some((r) => r.id === app.latest_release!.id)
      )
        releases.push(app.latest_release);
      return releases
        .filter(
          (r) =>
            (preferences.prereleases || !r.prerelease) &&
            (preferences.platform === "all" ||
              r.assets.some((a) => a.platform === preferences.platform)),
        )
        .map((release) => ({
          app,
          release,
          key: releaseKey(app.id, release.id),
        }));
    })
    .sort(
      (a, b) =>
        (Date.parse(b.release.released_at ?? "") || 0) -
        (Date.parse(a.release.released_at ?? "") || 0),
    );
}
