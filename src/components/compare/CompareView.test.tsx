// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FeedSchema } from "@/lib/schemas/omnisource";
import { comparisonStore } from "@/hooks/useComparison";
import { omniClient } from "@/lib/api/client";
import { CompareView } from "./CompareView";

const navigation = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => navigation,
  useSearchParams: () => new URLSearchParams(),
}));
const apps = FeedSchema.parse(JSON.parse(readFileSync("data/omnisource-feed.json", "utf8"))).apps.slice(0, 2);
afterEach(() => {
  cleanup(); comparisonStore.clear(); localStorage.clear(); vi.restoreAllMocks();
});
function renderComparison(initialIds: string[]) {
  vi.spyOn(omniClient, "getAppsByIds").mockImplementation(async ids => ({
    items: apps.filter(app => ids.includes(app.id)), freshness: null,
    pagination: { page: 1, per_page: 8, total: ids.length, total_pages: 1 },
  }));
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <CompareView initialIds={initialIds} initialApps={apps.filter(app => initialIds.includes(app.id))} />
  </QueryClientProvider>);
}
describe("comparison hydration", () => {
  it("restores the locally saved selection when the URL has no IDs", async () => {
    apps.forEach(app => comparisonStore.add(app.id));
    renderComparison([]);
    expect(await screen.findByRole("table")).toBeInTheDocument();
    for (const app of apps) expect(screen.getByRole("columnheader", { name: new RegExp(app.name) })).toBeInTheDocument();
  });
  it("does not resurrect initial URL IDs after removing the last app", async () => {
    const user = userEvent.setup();
    renderComparison([apps[0].id]);
    await user.click(await screen.findByRole("button", { name: `Remove ${apps[0].name} from comparison` }));
    expect(await screen.findByText(/Nothing selected yet/)).toBeInTheDocument();
    expect(comparisonStore.list()).toEqual([]);
  });
});
