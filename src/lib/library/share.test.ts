import { describe, expect, it } from "vitest";

import { decodeShare, encodeShare, shareUrl } from "./share";

describe("collection sharing", () => {
  const collection = {
    name: "My picks",
    description: "Daily drivers",
    appIds: ["localsend", "joplin", "keepassxc"],
  };

  it("round-trips a collection payload through base64url", () => {
    const encoded = encodeShare(collection);
    expect(encoded).not.toMatch(/[+/=]/); // URL-safe alphabet only
    const decoded = decodeShare(encoded);
    expect(decoded).toEqual(collection);
  });

  it("returns null for corrupt payloads instead of throwing", () => {
    expect(decodeShare("%%%not-base64%%%")).toBeNull();
    expect(decodeShare(Buffer.from(JSON.stringify({ nope: 1 })).toString("base64url"))).toBeNull();
  });

  it("builds an absolute import URL", () => {
    const url = shareUrl(collection);
    expect(url).toContain("/collections/mine?import=");
  });
});
