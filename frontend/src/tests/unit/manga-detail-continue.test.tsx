import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { api } from "@/api";
import { MangaDetailPage } from "@/features/catalog/pages/MangaDetailPage";

vi.mock("@/features/auth/stores/auth.store", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "reader@example.com", displayName: "Reader", avatarUrl: null, createdAt: "2024-01-01T00:00:00.000Z" }
  })
}));

vi.mock("@/stores/toast.store", () => ({
  useToast: () => ({ showToast: vi.fn() })
}));

vi.mock("@/api", async () => {
  const actual = await vi.importActual<typeof import("@/api")>("@/api");
  return {
    ...actual,
    api: {
      getManga: vi.fn(async () => ({
        id: "manga-1",
        title: "The Beginning After The End",
        altTitles: [],
        description: "A reader test manga.",
        status: "ongoing",
        tags: ["Action"],
        coverUrl: undefined
      })),
      getChapters: vi.fn(async () => ({
        data: [
          { id: "chapter-53", title: "Resolve", chapter: "53", volume: null, translatedLanguage: "en", publishAt: "2024-01-10T00:00:00.000Z", pages: 32, scanlationGroup: "Group A" }
        ],
        limit: 100,
        offset: 0,
        total: 1
      })),
      getMangaProgress: vi.fn(async () => ({
        progress: {
          id: "progress-53",
          userId: "user-1",
          mangaId: "manga-1",
          chapterId: "chapter-53",
          pageIndex: 16,
          completed: false,
          createdAt: "2024-01-10T00:00:00.000Z",
          updatedAt: "2024-01-10T00:00:00.000Z"
        },
        chaptersProgress: []
      })),
      getLibraryItem: vi.fn(async () => ({ item: null })),
      upsertLibrary: vi.fn(),
      removeLibrary: vi.fn()
    }
  };
});

describe("MangaDetailPage continue reading", () => {
  it("renders a one-click continue reading card with chapter and page", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/manga/manga-1"]}>
          <Routes>
            <Route path="/manga/:mangaId" element={<MangaDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText("Continue Reading")).toBeInTheDocument();
    expect(screen.getAllByText("The Beginning After The End").length).toBeGreaterThan(0);
    expect(screen.getByText("Chapter 53 · Page 17 / 32")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Read next/ })).toHaveAttribute("href", "/read/chapter-53?mangaId=manga-1");
  });

  it("refetches chapter feed when language filters change", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/manga/manga-1"]}>
          <Routes>
            <Route path="/manga/:mangaId" element={<MangaDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByLabelText("EN")).toBeChecked();
    await userEvent.click(screen.getByLabelText("VI"));

    expect(api.getChapters).toHaveBeenLastCalledWith("manga-1", { limit: 100, offset: 0, translatedLanguage: ["en"] });
  });
});
