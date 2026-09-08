/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ReleaseHistory } from "./ReleaseHistory";
import { buildRelease } from "@/test/factories";

describe("ReleaseHistory", () => {
  it("lists releases newest first", () => {
    const { container } = render(
      <ReleaseHistory
        releases={[
          buildRelease({ id: "r2", version: "2.0.0", releasedAt: "2026-08-01T00:00:00Z" }),
          buildRelease({ id: "r1", version: "1.0.0", releasedAt: "2026-01-01T00:00:00Z" }),
        ]}
      />,
    );
    const text = container.textContent ?? "";
    expect(text.indexOf("2.0.0")).toBeLessThan(text.indexOf("1.0.0"));
  });

  it("renders release notes as inert text, never as HTML", () => {
    const { container } = render(
      <ReleaseHistory
        releases={[
          buildRelease({
            notes: "## Fixed\n- <script>alert(1)</script> crash\n- [link](javascript:alert(1))",
          }),
        ]}
      />,
    );
    expect(container.innerHTML).not.toMatch(/<script/i);
    expect(container.innerHTML).not.toMatch(/javascript:/i);
    expect(container.textContent).toMatch(/Fixed/);
    expect(container.textContent).toMatch(/crash/);
  });

  it("labels pre-releases", () => {
    const { container } = render(
      <ReleaseHistory releases={[buildRelease({ prerelease: true })]} />,
    );
    expect(container.textContent).toMatch(/pre-?release/i);
  });

  it("respects the limit and links to the full history", () => {
    render(
      <ReleaseHistory
        releases={[
          buildRelease({ id: "r1", version: "3.0.0" }),
          buildRelease({ id: "r2", version: "2.0.0" }),
          buildRelease({ id: "r3", version: "1.0.0" }),
        ]}
        limit={2}
        showAllHref="/apps/example/releases"
      />,
    );
    expect(screen.getByRole("link", { name: /all releases|view all/i })).toHaveAttribute(
      "href",
      "/apps/example/releases",
    );
  });

  it("explains an empty history honestly", () => {
    const { container } = render(<ReleaseHistory releases={[]} />);
    expect(container.textContent).toMatch(/no releases have been published/i);
  });

  it("uses native details/summary so notes work without JavaScript", () => {
    const { container } = render(<ReleaseHistory releases={[buildRelease({ notes: "Some notes" })]} />);
    expect(container.querySelector("details")).not.toBeNull();
    expect(container.querySelector("summary")).not.toBeNull();
  });
});
