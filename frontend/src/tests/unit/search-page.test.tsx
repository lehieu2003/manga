import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SearchPage } from "@/features/catalog/pages/SearchPage";

const searchMangaMock = vi.hoisted(() => vi.fn());
const getSearchHistoryMock = vi.hoisted(() => vi.fn());
const clearSearchHistoryMock = vi.hoisted(() => vi.fn());

vi.mock("@/api", async () => {
  const actual = await vi.importActual<typeof import("@/api")>("@/api");
  return {
    ...actual,
    api: {
      searchManga: searchMangaMock,
      getSearchHistory: getSearchHistoryMock,
      clearSearchHistory: clearSearchHistoryMock,
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
    localStorage.clear();
    searchMangaMock.mockReset();
    getSearchHistoryMock.mockReset();
    clearSearchHistoryMock.mockReset();
    searchMangaMock.mockResolvedValue({
      data: [{ id: "manga-1", title: "Bare Manga", altTitles: [], description: "", tags: [] }],
      limit: 24,
      offset: 0,
      total: 1,
      source: "live"
    });
    getSearchHistoryMock.mockResolvedValue({
      data: [],
      limit: 8,
      offset: 0,
      total: 0
    });
    clearSearchHistoryMock.mockResolvedValue({ ok: true, summary: { affectedCount: 1 } });
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

    await user.type(screen.getByLabelText("Author"), "ONE");
    await waitFor(() => expect(searchMangaMock).toHaveBeenLastCalledWith(expect.objectContaining({ author: "ONE" })));
    expect(screen.getByRole("button", { name: "Author: ONE" })).toBeInTheDocument();

    await user.type(screen.getByLabelText("Artist"), "Murata");
    await waitFor(() => expect(searchMangaMock).toHaveBeenLastCalledWith(expect.objectContaining({ artist: "Murata" })));
    expect(screen.getByRole("button", { name: "Artist: Murata" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear" }));
    await waitFor(() => expect(searchMangaMock).toHaveBeenLastCalledWith(expect.objectContaining({ includedTags: [], author: "", artist: "" })));
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

  it("shows authenticated search history, applies a query, and clears it", async () => {
    const user = userEvent.setup();
    localStorage.setItem("manga.accessToken", "access-token");
    getSearchHistoryMock.mockResolvedValue({
      data: [
        { id: "history-1", userId: "user-1", query: "One Punch Man", createdAt: "2024-01-02T00:00:00.000Z" },
        { id: "history-2", userId: "user-1", query: "one punch man", createdAt: "2024-01-01T00:00:00.000Z" }
      ],
      limit: 8,
      offset: 0,
      total: 2
    });
    renderSearch("/search");

    expect(await screen.findByRole("heading", { name: "Recent searches" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "One Punch Man" })).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "One Punch Man" }));
    await waitFor(() => expect(searchMangaMock).toHaveBeenLastCalledWith(expect.objectContaining({ q: "One Punch Man" })));

    await user.click(within(screen.getByLabelText("Recent searches")).getByRole("button", { name: "Clear" }));
    await waitFor(() => expect(clearSearchHistoryMock).toHaveBeenCalledTimes(1));
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
