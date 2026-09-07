/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppCard } from "./AppCard";
import { buildApp } from "@/test/factories";

describe("AppCard", () => {
  it("links to the app page and shows its name", () => {
    render(<AppCard app={buildApp({ name: "LocalSend", slug: "localsend" })} />);
    const link = screen.getByRole("link", { name: "LocalSend" });
    expect(link).toHaveAttribute("href", "/apps/localsend");
  });

  it("shows a real summary", () => {
    render(<AppCard app={buildApp({ summary: "Open-source AirDrop alternative" })} />);
    expect(screen.getByText("Open-source AirDrop alternative")).toBeInTheDocument();
  });

  it("says so when upstream publishes no summary", () => {
    const { container } = render(<AppCard app={buildApp({ summary: null })} />);
    expect(container.textContent).toMatch(/description unavailable/i);
  });

  it("lists the platforms OmniSource reported", () => {
    render(<AppCard app={buildApp({ platforms: ["linux", "macos"] })} />);
    expect(screen.getByText(/linux/i)).toBeInTheDocument();
    expect(screen.getByText(/macos/i)).toBeInTheDocument();
  });

  it("shows version and freshness only when upstream publishes them", () => {
    const { container } = render(<AppCard app={buildApp({ latestRelease: null, updatedAt: null })} />);
    expect(container.textContent).not.toMatch(/updated \d/i);
  });

  it("never renders a star rating", () => {
    const { container } = render(<AppCard app={buildApp()} />);
    expect(container.textContent).not.toMatch(/★|rating|\d\.\d out of 5/i);
  });

  it("renders a favorite control that does not navigate away", () => {
    render(<AppCard app={buildApp()} />);
    const button = screen.getByRole("button", { name: /favorite|save/i });
    expect(button).toHaveAttribute("type", "button");
  });
});
