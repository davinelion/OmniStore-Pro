import { afterEach, describe, expect, it, vi } from "vitest";
import { omniClient } from "./client";
afterEach(() => vi.unstubAllGlobals());
describe("app ID batching", () => {
  it("never turns an empty collection into an all-apps query", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect((await omniClient.getAppsByIds([])).items).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("resolves more than eight IDs in bounded batches", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            items: [],
            pagination: { page: 1, per_page: 8, total: 0, total_pages: 0 },
          }),
        ),
      );
    fetch.mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            items: [],
            pagination: { page: 1, per_page: 8, total: 0, total_pages: 0 },
          }),
        ),
    );
    vi.stubGlobal("fetch", fetch);
    await omniClient.getAppsByIds(
      Array.from({ length: 17 }, (_, i) => `app${i}`),
    );
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch.mock.calls[2][0]).toBe("/api/v1/apps?ids=app16");
  });
});
