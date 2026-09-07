/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DownloadPanel } from "./DownloadPanel";
import { buildApp, buildAsset, buildRelease } from "@/test/factories";

/**
 * The download panel is the safety-critical component: an unverified artefact
 * must never be presented as an ordinary download.
 */

const appWith = (assets: ReturnType<typeof buildAsset>[]) =>
  buildApp({ latestRelease: { ...buildRelease(), assets } });

describe("DownloadPanel", () => {
  it("offers a VALID asset as a download", () => {
    const asset = buildAsset();
    render(<DownloadPanel app={appWith([asset])} />);
    const link = screen.getByRole("link", { name: /download/i });
    expect(link).toHaveAttribute("href", asset.url);
  });

  it("shows real file metadata instead of placeholders", () => {
    const { container } = render(<DownloadPanel app={appWith([buildAsset({ size: 12_345_678 })])} />);
    expect(screen.getAllByText(/11\.8 MB/i).length).toBeGreaterThan(0);
    // The size is shown as metadata, never as a placeholder.
    expect(container.textContent).not.toMatch(/— MB|undefined MB/);
  });

  it("never offers an INVALID asset as a download", () => {
    const { container } = render(<DownloadPanel app={appWith([buildAsset({ status: "INVALID" })])} />);
    const hrefs = screen.queryAllByRole("link").map((link) => link.getAttribute("href") ?? "");
    expect(hrefs).not.toContain(buildAsset().url);
    expect(screen.queryByRole("link", { name: /download/i })).toBeNull();
    expect(container.textContent).toMatch(/not offered as a normal download/i);
    expect(container.textContent).toMatch(/failed upstream validation/i);
  });

  it("never offers a QUARANTINED asset as a download", () => {
    const { container } = render(<DownloadPanel app={appWith([buildAsset({ status: "QUARANTINED" })])} />);
    expect(container.textContent).toMatch(/quarantined/i);
    expect(screen.queryByRole("link", { name: /download/i })).toBeNull();
  });

  it("labels REVIEW_REQUIRED and UNKNOWN as unavailable verification", () => {
    for (const status of ["REVIEW_REQUIRED", "UNKNOWN"] as const) {
      const { container, unmount } = render(
        <DownloadPanel app={appWith([buildAsset({ id: status, status })])} />,
      );
      const hrefs = screen.queryAllByRole("link").map((link) => link.getAttribute("href") ?? "");
      expect(hrefs).not.toContain(buildAsset().url);
      expect(container.textContent).toMatch(
        status === "UNKNOWN" ? /verification unavailable/i : /review required|pending review/i,
      );
      unmount();
    }
  });

  it("renders an unsafe download URL as no link at all", () => {
    const app = buildApp({
      latestRelease: { ...buildRelease(), assets: [buildAsset({ url: "javascript:alert(1)" })] },
    });
    render(<DownloadPanel app={app} />);
    expect(document.querySelector('[href^="javascript:"]')).toBeNull();
  });

  it("explains an empty release honestly", () => {
    const { container } = render(<DownloadPanel app={buildApp({ latestRelease: null, releases: [] })} />);
    expect(container.textContent).toMatch(/no packages are published/i);
  });

  it("offers each platform separately", () => {
    render(
      <DownloadPanel
        app={appWith([
          buildAsset({ id: "win", platform: "windows", packageType: "MSI", filename: "app-x64.msi" }),
          buildAsset({ id: "mac", platform: "macos", packageType: "DMG", filename: "app.dmg" }),
          buildAsset({ id: "lin", platform: "linux", filename: "app-x86_64.AppImage" }),
        ])}
      />,
    );
    expect(screen.getByRole("radio", { name: /windows/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /macos/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /linux/i })).toBeInTheDocument();
  });

  it("only emits https download links", () => {
    render(<DownloadPanel app={appWith([buildAsset()])} />);
    for (const link of screen.getAllByRole("link")) {
      const href = link.getAttribute("href") ?? "";
      if (href.startsWith("http")) expect(href.startsWith("https://")).toBe(true);
    }
  });

  it("never claims an app is safe or malware-free", () => {
    const { container } = render(<DownloadPanel app={appWith([buildAsset()])} />);
    expect(container.textContent).not.toMatch(/100% safe|virus-free|guaranteed safe|malware-free/i);
  });
});
