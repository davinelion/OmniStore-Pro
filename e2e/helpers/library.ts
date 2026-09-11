import type { Page } from "@playwright/test";

/**
 * Wait until the browser's local library database actually contains the
 * expected write. Store updates are synchronous in React, but the IndexedDB
 * write behind them is async — navigating before it commits loses the data.
 */
export function waitForLibraryWrite(
  page: Page,
  check: { kind?: string; appId?: string; collectionName?: string },
  timeout = 5000,
): Promise<void> {
  return page.waitForFunction(
    ({ kind, appId, collectionName }) =>
      new Promise<boolean>((resolve) => {
        let db: IDBDatabase | null = null;
        const done = (value: boolean) => {
          db?.close();
          resolve(value);
        };
        const open = indexedDB.open("omnistore-library");
        open.onsuccess = () => {
          db = open.result;
          try {
            if (kind && appId) {
              const request = db.transaction("lists", "readonly").objectStore("lists").get(kind);
              request.onsuccess = () => {
                const ids: unknown = request.result?.appIds;
                done(Array.isArray(ids) && ids.includes(appId));
              };
              request.onerror = () => done(false);
            } else if (collectionName) {
              const request = db
                .transaction("collections", "readonly")
                .objectStore("collections")
                .getAll();
              request.onsuccess = () => {
                const names = (request.result ?? []).map((row) => (row as { name?: string }).name);
                done(names.includes(collectionName));
              };
              request.onerror = () => done(false);
            } else {
              done(false);
            }
          } catch {
            done(false);
          }
        };
        open.onerror = () => done(false);
      }),
    check,
    { timeout },
  ).then(() => undefined);
}
