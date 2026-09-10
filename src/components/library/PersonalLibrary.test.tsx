// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PersonalLibrary } from "./PersonalLibrary";
vi.mock("@/hooks/useLocalCollections", () => ({
  useFavorites: () => ({ ids: [] }),
}));
afterEach(() => {
  cleanup();
  localStorage.clear();
  location.hash = "";
});
function setup() {
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <PersonalLibrary />
    </QueryClientProvider>,
  );
  return userEvent.setup();
}
describe("personal library interactions", () => {
  it("creates, persists, renames, and shares a list", async () => {
    const user = setup();
    await user.type(
      await screen.findByLabelText("Collection name"),
      "My toolkit",
    );
    await user.click(screen.getByRole("button", { name: "Create collection" }));
    expect(screen.getByRole("heading", { name: "My toolkit" })).toBeTruthy();
    expect(
      JSON.parse(localStorage.getItem("omnistore:library:v1")!).lists[0].name,
    ).toBe("My toolkit");
    await user.click(screen.getByRole("button", { name: "Create share link" }));
    expect(
      (screen.getByLabelText("Share link") as HTMLInputElement).value,
    ).toContain("/library#list=");
    const rename = screen.getByLabelText("Rename collection");
    await user.clear(rename);
    await user.type(rename, "Renamed");
    await user.tab();
    expect(screen.getByRole("heading", { name: "Renamed" })).toBeTruthy();
  });
  it("adds imports without replacing existing collections", async () => {
    localStorage.setItem(
      "omnistore:library:v1",
      JSON.stringify({
        version: 1,
        lists: [{ id: "existing", name: "Existing", entries: [] }],
      }),
    );
    const user = setup();
    const incoming = JSON.stringify({
      version: 1,
      lists: [{ id: "existing", name: "Imported", entries: [] }],
    });
    const file = new File([incoming], "backup.json", {
      type: "application/json",
    });
    Object.defineProperty(file, "text", { value: async () => incoming });
    await user.upload(
      await screen.findByLabelText("Import backup (adds lists)"),
      file,
    );
    await waitFor(() =>
      expect(
        JSON.parse(localStorage.getItem("omnistore:library:v1")!).lists,
      ).toHaveLength(2),
    );
    expect(screen.getByRole("heading", { name: "Existing" })).toBeTruthy();
  });
  it("reports corrupt storage rather than crashing", async () => {
    localStorage.setItem("omnistore:library:v1", "broken");
    setup();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Local data could not be loaded",
    );
  });
});
