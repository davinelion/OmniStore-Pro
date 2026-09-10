import { afterEach, describe, expect, it, vi } from "vitest";
import { EventSchema } from "./events";
import { POST } from "@/app/api/v1/events/route";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
function request(body: string, origin = "https://store.test") {
  return new Request("https://store.test/api/v1/events", {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body,
  });
}
describe("count-only telemetry", () => {
  it("rejects extra data and unknown events", () => {
    expect(
      EventSchema.safeParse({ event: "search", query: "private" }).success,
    ).toBe(false);
    expect(EventSchema.safeParse({ event: "unknown" }).success).toBe(false);
  });
  it("is disabled by default", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_ANALYTICS", "false");
    expect((await POST(request('{"event":"search"}'))).status).toBe(404);
  });
  it("accepts only bounded same-origin count events", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_ANALYTICS", "true");
    const log = vi.spyOn(console, "info").mockImplementation(() => undefined);
    expect((await POST(request('{"event":"search"}'))).status).toBe(202);
    expect(log).toHaveBeenCalledWith(
      JSON.stringify({ service: "omnistore", metric: "search", count: 1 }),
    );
    expect(
      (await POST(request('{"event":"search"}', "https://other.test"))).status,
    ).toBe(403);
    expect((await POST(request("x".repeat(257)))).status).toBe(413);
  });
});
