import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminPage } from "@/features/admin/pages/AdminPage";

const apiMocks = vi.hoisted(() => ({
  getOverview: vi.fn()
}));

vi.mock("@/api", async () => {
  const actual = await vi.importActual<typeof import("@/api")>("@/api");
  return {
    ...actual,
    api: {
      ...actual.api,
      admin: {
        ...actual.api.admin,
        getOverview: apiMocks.getOverview
      }
    }
  };
});

describe("AdminPage", () => {
  beforeEach(() => {
    sessionStorage.clear();
    apiMocks.getOverview.mockReset().mockResolvedValue({
      users: 2,
      activeSessions: 1,
      cachedManga: 3,
      cachedChapters: 4,
      libraryItems: 5,
      readingProgress: 6,
      searchHistory: 7,
      latestCatalogFetchAt: null
    });
  });

  it("stores an admin token in session storage", async () => {
    const user = userEvent.setup();
    renderAdmin();

    await user.type(screen.getByLabelText("Admin token"), "admin-sync-token");
    await user.click(screen.getByRole("button", { name: "Unlock admin" }));

    expect(sessionStorage.getItem("manga.adminToken")).toBe("admin-sync-token");
    expect(await screen.findByText("Data operations")).toBeInTheDocument();
  });

  it("renders overview counts after token is available", async () => {
    sessionStorage.setItem("manga.adminToken", "admin-sync-token");
    renderAdmin();

    expect((await screen.findAllByText("Cached chapters")).length).toBeGreaterThan(0);
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getAllByText("4").length).toBeGreaterThan(0);
  });
});

function renderAdmin() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}
