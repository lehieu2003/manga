import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SearchPage } from "../pages/SearchPage";

const searchMangaMock = vi.hoisted(() => vi.fn());

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return {
    ...actual,
    api: {
      searchManga: searchMangaMock,
      getGenres: vi.fn(async () => ({
        data: [
          { name: "Action", count: 12 },
          { name: "Romance", count: 8 }
        ]
      }))
    }
  };
});

describe("SearchPage discovery", () => {
  beforeEach(() => {
    searchMangaMock.mockReset();
    searchMangaMock.mockResolvedValue({
      data: [{ id: "manga-1", title: "Bare Manga", altTitles: [], description: "", tags: [] }],
      limit: 24,
      offset: 0,
      total: 1,
      source: "live"
    });
  });

  it("uses the popular preset sort route", async () => {
    renderSearch("/discover/popular");

    expect(await screen.findByRole("heading", { name: "Popular manga" })).toBeInTheDocument();
    await waitFor(() => expect(searchMangaMock).toHaveBeenCalledWith(expect.objectContaining({ sort: "followed" })));
  });

  it("updates filters, active chips, and clear-all behavior", async () => {
    const user = userEvent.setup();
    renderSearch("/search");

    await user.click((await screen.findAllByRole("button", { name: /Action, 12 manga/ }))[0]);
    await waitFor(() => expect(searchMangaMock).toHaveBeenLastCalledWith(expect.objectContaining({ includedTags: ["Action"] })));
    expect(screen.getByRole("button", { name: "Include: Action" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear" }));
    await waitFor(() => expect(searchMangaMock).toHaveBeenLastCalledWith(expect.objectContaining({ includedTags: [] })));
  });

  it("keeps genre routes as an active discovery tag and shows cache state", async () => {
    searchMangaMock.mockResolvedValue({
      data: [],
      limit: 24,
      offset: 0,
      total: 0,
      source: "cache"
    });
    renderSearch("/genres/Romance");

    expect(await screen.findByRole("heading", { name: "Browse Romance" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Include: Romance" })).toBeInTheDocument();
    expect(await screen.findByText(/Showing cached manga for tag filters/)).toBeInTheDocument();
    expect(await screen.findByText(/No manga matches this discovery mix/)).toBeInTheDocument();
  });
});

function renderSearch(route: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/search" element={<SearchPage />} />
          <Route path="/discover/popular" element={<SearchPage />} />
          <Route path="/discover/latest" element={<SearchPage />} />
          <Route path="/genres/:genre" element={<SearchPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}
