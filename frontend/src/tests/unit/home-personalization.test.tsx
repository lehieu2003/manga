import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HomePage } from "@/features/catalog/pages/HomePage";
import type { LibraryItem } from "@/types";

const state = vi.hoisted(() => ({
  user: { id: "user-1", email: "reader@example.com", displayName: "Reader", role: "USER", avatarUrl: null, createdAt: "2024-01-01T00:00:00.000Z" } as const,
  libraryItems: [] as LibraryItem[]
}));

vi.mock("@/features/auth/stores/auth.store", () => ({
  useAuth: () => ({ user: state.user })
}));

vi.mock("@/api", async () => {
  const actual = await vi.importActual<typeof import("@/api")>("@/api");
  return {
    ...actual,
    api: {
      searchManga: vi.fn(async () => ({ data: [], limit: 12, offset: 0, total: 0 })),
      getGenres: vi.fn(async () => ({ data: [] })),
      getLibrary: vi.fn(async () => ({ data: state.libraryItems }))
    }
  };
});

describe("HomePage personalization", () => {
  beforeEach(() => {
    state.libraryItems = [
      makeLibraryItem({
        id: "library-old",
        mangaId: "manga-old",
        title: "Older Shelf",
        chapterId: "chapter-old",
        pageIndex: 3,
        updatedAt: "2024-01-02T00:00:00.000Z"
      }),
      makeLibraryItem({
        id: "library-new",
        mangaId: "manga-new",
        title: "Newest Shelf",
        chapterId: "chapter-new",
        pageIndex: 8,
        updatedAt: "2024-01-05T00:00:00.000Z"
      })
    ];
  });

  it("renders global continue reading and recently read in activity order", async () => {
    renderHome();

    expect(await screen.findByText("Continue Reading")).toBeInTheDocument();
    expect(await screen.findAllByRole("heading", { name: "Newest Shelf" })).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Continue" })).toHaveAttribute("href", "/read/chapter-new?mangaId=manga-new");

    const recentSection = screen.getByText("Back to your shelf").closest("div")!.parentElement!.parentElement!;
    const recentLinks = within(recentSection).getAllByRole("link");
    expect(recentLinks[1]).toHaveAttribute("href", "/read/chapter-new?mangaId=manga-new");
    expect(recentLinks[2]).toHaveAttribute("href", "/read/chapter-old?mangaId=manga-old");
  });

  it("renders a logged-in empty state when the shelf has no progress", async () => {
    state.libraryItems = [];
    renderHome();

    expect(await screen.findByText(/Your shelf is quiet/)).toBeInTheDocument();
    expect(screen.getByText(/Read a chapter and your recent shelf will appear here/)).toBeInTheDocument();
  });
});

function renderHome() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function makeLibraryItem(input: { id: string; mangaId: string; title: string; chapterId: string; pageIndex: number; updatedAt: string }): LibraryItem {
  return {
    id: input.id,
    userId: "user-1",
    mangaId: input.mangaId,
    status: "READING",
    isFavorite: false,
    lastChapterId: input.chapterId,
    lastReadAt: input.updatedAt,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: input.updatedAt,
    manga: { id: input.mangaId, title: input.title, coverUrl: undefined, status: "ongoing", year: 2024, tags: ["Action"] },
    readingProgress: {
      id: `progress-${input.id}`,
      userId: "user-1",
      mangaId: input.mangaId,
      chapterId: input.chapterId,
      pageIndex: input.pageIndex,
      completed: false,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: input.updatedAt
    }
  };
}
