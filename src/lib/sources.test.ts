import { describe, expect, it } from "vitest";

import { parseSourceUrl, sourceFromRepository, SOURCE_LABELS } from "./sources";

describe("parseSourceUrl", () => {
  it("treats a bare owner/name as GitHub", () => {
    expect(parseSourceUrl("localsend/localsend")).toMatchObject({
      source: "github",
      slug: "localsend/localsend",
      url: "https://github.com/localsend/localsend",
      label: "GitHub",
    });
  });

  it("parses a canonical https repository URL", () => {
    expect(parseSourceUrl("https://github.com/laurent22/joplin")).toMatchObject({
      source: "github",
      slug: "laurent22/joplin",
      url: "https://github.com/laurent22/joplin",
    });
  });

  it("strips a .git suffix and a trailing slash", () => {
    expect(parseSourceUrl("https://github.com/laurent22/joplin.git")).toMatchObject({
      slug: "laurent22/joplin",
      url: "https://github.com/laurent22/joplin",
    });
    expect(parseSourceUrl("https://github.com/laurent22/joplin/")?.slug).toBe("laurent22/joplin");
  });

  it("ignores a www. prefix", () => {
    expect(parseSourceUrl("https://www.github.com/laurent22/joplin")?.slug).toBe(
      "laurent22/joplin",
    );
  });

  it("understands scp-style git remotes", () => {
    expect(parseSourceUrl("git@github.com:laurent22/joplin.git")).toMatchObject({
      source: "github",
      slug: "laurent22/joplin",
      url: "https://github.com/laurent22/joplin",
    });
  });

  it("adds a scheme when one is missing", () => {
    expect(parseSourceUrl("github.com/laurent22/joplin")?.source).toBe("github");
  });

  it.each([
    ["https://gitlab.gnome.org/GNOME/gimp", "gitlab"],
    ["https://codeberg.org/forgejo/forgejo", "codeberg"],
    ["https://gitea.com/x/y", "forgejo"],
    ["https://flathub.org/apps/com.obsproject.Studio", "flathub"],
    ["https://f-droid.org/packages/com.example.app", "fdroid"],
    ["https://formulae.brew.sh/formula/ffmpeg", "homebrew"],
    ["https://winget.run/pkg/Microsoft/PowerToys", "winget"],
  ])("identifies %s as %s", (url, source) => {
    expect(parseSourceUrl(url)?.source).toBe(source);
  });

  it("leaves only the owner/name slug for forges", () => {
    expect(parseSourceUrl("https://codeberg.org/forgejo/forgejo/issues/42")?.slug).toBe(
      "forgejo/forgejo",
    );
  });

  it("rejects unusable input", () => {
    expect(parseSourceUrl("")).toBeNull();
    expect(parseSourceUrl("   ")).toBeNull();
    expect(parseSourceUrl("not a url with spaces")).toBeNull();
  });

  it("rejects non-http schemes", () => {
    expect(parseSourceUrl("javascript:alert(1)")).toBeNull();
    expect(parseSourceUrl("file:///etc/passwd")).toBeNull();
  });
});

describe("SOURCE_LABELS", () => {
  it("covers every source id", () => {
    expect(Object.keys(SOURCE_LABELS)).toHaveLength(9);
  });
});

describe("sourceFromRepository", () => {
  it("derives the source from a catalog repository URL", () => {
    expect(sourceFromRepository("https://codeberg.org/forgejo/forgejo")).toBe("codeberg");
    expect(sourceFromRepository("https://github.com/localsend/localsend")).toBe("github");
  });

  it("falls back to 'other' for missing or malformed values", () => {
    expect(sourceFromRepository(null)).toBe("other");
    expect(sourceFromRepository(undefined)).toBe("other");
    expect(sourceFromRepository("not-a-url")).toBe("other");
  });
});
