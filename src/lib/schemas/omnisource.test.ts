import { describe, expect, it } from "vitest";
import { AppSchema } from "./omnisource";

describe("AppSchema", () => {
  it("accepts extra fields", () => {
    const r = AppSchema.safeParse({
      id: "a",
      slug: "a",
      name: "A",
      extra: true,
    });
    expect(r.success).toBe(true);
  });
  it("rejects missing id", () => {
    const r = AppSchema.safeParse({ slug: "a", name: "A" });
    expect(r.success).toBe(false);
  });
});
