/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SearchResults } from "./SearchResults";
import { DEFAULT_FILTERS } from "@/lib/search/query";
import { buildApp } from "@/test/factories";

/**
 * Search states: loading, results, empty and error. A slow or failing
 * OmniSource must never produce a blank page.
 */

const searchMock = vi.fn();

vi.mock("@/lib/api/client", () => ({
  omniClient: {
    search: (...args: unknown[]) => searchMock(...args),
  },
  queryKeys: { search: (filters: unknown) => ["search", JSON.stringify(filters)] },
  userFacingError: (error: unknown) =>
    error instanceof Error ? error.message : "Something went wrong.",
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

function renderResults(filters = DEFAULT_FILTERS) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const onFiltersChange = vi.fn();
  const view = render(
    <QueryClientProvider client={client}>
      <SearchResults filters={filters} onFiltersChange={onFiltersChange} />
    </QueryClientProvider>,
  );
  return { ...view, onFiltersChange };
}

const page = (items: ReturnType<typeof buildApp>[], total = items.length) => ({
  items,
  pagination: { page: 1, per_page: 24, total, total_pages: 1 },
  freshness: "2026-09-08T00:00:00Z",
});

beforeEach(() => {
  searchMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("SearchResults", () => {
  it("shows a loading state while the first request is in flight", () => {
    searchMock.mockReturnValue(new Promise(() => undefined));
    renderResults();
    expect(screen.getByText(/searching/i)).toBeInTheDocument();
  });

  it("renders results with a live-result count", async () => {
    searchMock.mockResolvedValue(page([buildApp({ name: "LocalSend", slug: "localsend" })]));
    renderResults({ ...DEFAULT_FILTERS, q: "localsend" });

    await waitFor(() => expect(screen.getByRole("link", { name: "LocalSend" })).toBeInTheDocument());
    expect(screen.getByText(/results? for/i)).toBeInTheDocument();
  });

  it("announces the result count politely for screen readers", async () => {
    searchMock.mockResolvedValue(page([buildApp(), buildApp({ id: "second" })]));
    const { container } = renderResults();
    await waitFor(() => expect(screen.getAllByRole("link").length).toBeGreaterThan(1));
    expect(container.querySelector('[aria-live="polite"]')).not.toBeNull();
  });

  it("shows an actionable empty state", async () => {
    searchMock.mockResolvedValue(page([]));
    renderResults({ ...DEFAULT_FILTERS, q: "zzzqqq" });

    await waitFor(() => expect(screen.getByText(/no apps found/i)).toBeInTheDocument());
    const clear = screen.getByRole("button", { name: /clear filters/i });
    expect(clear).toBeInTheDocument();
  });

  it("shows an error state with a retry that re-queries", async () => {
    const user = userEvent.setup();
    searchMock.mockRejectedValueOnce(new Error("OmniSource is unavailable.")).mockResolvedValueOnce(
      page([buildApp({ name: "Recovered" })]),
    );

    renderResults();
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByText(/OmniSource is unavailable/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /try again/i }));
    await waitFor(() => expect(screen.getByRole("link", { name: "Recovered" })).toBeInTheDocument());
    expect(searchMock).toHaveBeenCalledTimes(2);
  });

  it("changing sort resets pagination and asks for the new order", async () => {
    const user = userEvent.setup();
    searchMock.mockResolvedValue(page([buildApp()]));
    const { onFiltersChange } = renderResults();

    await waitFor(() => expect(screen.getAllByRole("link").length).toBeGreaterThan(0));
    await user.selectOptions(screen.getByLabelText(/sort/i), "trust");

    expect(onFiltersChange).toHaveBeenCalledWith({ sort: "trust", page: 1 });
  });

  it("paginates", async () => {
    const user = userEvent.setup();
    searchMock.mockResolvedValue({
      items: [buildApp()],
      pagination: { page: 1, per_page: 24, total: 100, total_pages: 5 },
      freshness: "2026-09-08T00:00:00Z",
    });
    const { onFiltersChange } = renderResults();

    await waitFor(() => expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(onFiltersChange).toHaveBeenCalledWith({ page: 2 });
  });
});
