// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UpdateInbox } from "./UpdateInbox";
const ids = ["demo"];
vi.mock("@/hooks/useLocalCollections", () => ({ useWatch: () => ({ ids }) }));
vi.mock("@/lib/api/client", () => ({
  userFacingError: () => "Failed",
  omniClient: {
    getAppsByIds: async () => ({
      items: [
        {
          id: "demo",
          slug: "demo",
          name: "Demo",
          latest_release: null,
          releases: [
            {
              id: "r1",
              version: "1.0",
              prerelease: false,
              released_at: "2026-09-01",
              assets: [],
            },
          ],
        },
      ],
    }),
  },
}));
afterEach(() => {
  cleanup();
  localStorage.clear();
});
describe("update inbox interactions", () => {
  it("marks releases read and persists the state", async () => {
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <UpdateInbox />
      </QueryClientProvider>,
    );
    await user.click(
      await screen.findByRole("button", { name: /^Mark read$/ }),
    );
    expect(screen.getByRole("button", { name: "Mark unread" })).toBeTruthy();
    expect(
      JSON.parse(localStorage.getItem("omnistore:inbox:v1")!).read,
    ).toHaveLength(1);
    await user.click(screen.getByLabelText(/Unread only/));
    expect(screen.getByText(/No releases match these filters/)).toBeTruthy();
  });
});
