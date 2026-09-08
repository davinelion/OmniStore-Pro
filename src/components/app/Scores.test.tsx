/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ScoreChip, ScorePanel } from "./Scores";
import { buildApp } from "@/test/factories";

describe("ScorePanel", () => {
  it("shows each score with its value", () => {
    render(<ScorePanel app={buildApp({ trust: 88, quality: 82, popularity: 74 })} />);
    expect(screen.getByText(/trust/i)).toBeInTheDocument();
    expect(screen.getAllByText(/88/).length).toBeGreaterThan(0);
  });

  it("always shows the disclaimer that scores are not a security guarantee", () => {
    const { container } = render(<ScorePanel app={buildApp()} />);
    expect(container.textContent).toMatch(/not a security guarantee/i);
  });

  it("names the algorithm and version", () => {
    const { container } = render(<ScorePanel app={buildApp()} />);
    expect(container.textContent).toMatch(/omnisource-signals/i);
    expect(container.textContent).toMatch(/1\.0\.0/);
  });

  it("shows the factors behind each number", () => {
    const { container } = render(<ScorePanel app={buildApp()} />);
    expect(container.textContent).toMatch(/open-source license/i);
    expect(container.textContent).toMatch(/stars/i);
  });

  it("handles scores OmniSource could not compute", () => {
    const { container } = render(<ScorePanel app={buildApp({ trust: null, quality: null, popularity: null })} />);
    expect(container.textContent).toMatch(/not available/i);
    expect(container.textContent).not.toMatch(/NaN|undefined/);
  });
});

describe("ScoreChip", () => {
  it("renders a value", () => {
    render(<ScoreChip label="Trust" value={91} />);
    expect(screen.getByText(/91/)).toBeInTheDocument();
  });

  it("renders a null value as unavailable", () => {
    const { container } = render(<ScoreChip label="Trust" value={null} />);
    expect(container.textContent).toMatch(/not available|—/i);
  });
});
