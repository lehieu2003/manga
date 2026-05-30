import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LibraryPage } from "../pages/LibraryPage";
import type { LibraryItem } from "../types";

const state = vi.hoisted(() => ({
  items: [] as LibraryItem[]
}));

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return {
    ...actual,
    api: {
      getLibrary: vi.fn(async () => ({ data: state.items })),
      upsertLibrary: vi.fn(),
      removeLibrary: vi.fn()
    }
  };
});

describe("LibraryPage", () => {
  beforeEach(() => {
    state.items = [
      makeLibraryItem({
        id: "library-1",
        mangaId: "manga-1",
        title: "Chainsaw Man",
        status: "READING",
        tags: ["Action", "Devils"],
        isFavorite: true,
        chapterId: "chapter-1",
        pageIndex: 4,
        activityAt: "2024-01-05T00:00:00.000Z"
      }),
      makeLibraryItem({
        id: "library-2",
        mangaId: "manga-2",
        title: "Blue Period",
        status: "READING",
        tags: ["Drama"],
        isFavorite: false,
        chapterId: "chapter-2",
        pageIndex: 1,
        activityAt: "2024-01-03T00:00:00.000Z"
      }),
      makeLibraryItem({
        id: "library-3",
        mangaId: "manga-3",
        title: "A Silent Voice",
        status: "COMPLETED",
        tags: ["Drama"],
        isFavorite: false,
        chapterId: "chapter-3",
        pageIndex: 11,
        activityAt: "2024-01-07T00:00:00.000Z"
      }),
      makeLibraryItem({
        id: "library-4",
        mangaId: "manga-missing",
        title: "Missing Metadata",
        status: "READING",
        tags: [],
        isFavorite: false,
        chapterId: "chapter-4",
        pageIndex: 0,
        activityAt: "2024-01-01T00:00:00.000Z",
        manga: null
      })
    ];
  });

  it("renders cached manga metadata and continue reading state", async () => {
    renderLibrary();

    expect(await screen.findByText("Chainsaw Man")).toBeInTheDocument();
    expect(screen.getAllByText(/Continue chapter/).length).toBeGreaterThan(0);
    expect(screen.getByText("manga-missing")).toBeInTheDocument();
  });

  it("searches library by title, tag, and status", async () => {
    const user = userEvent.setup();
    renderLibrary();

    await user.type(await screen.findByPlaceholderText("Search title, tag, or status..."), "devils");
    expect(screen.getByText("Chainsaw Man")).toBeInTheDocument();
    expect(screen.queryByText("Blue Period")).not.toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText("Search title, tag, or status..."));
    await user.type(screen.getByPlaceholderText("Search title, tag, or status..."), "reading");
    expect(screen.getByText("Chainsaw Man")).toBeInTheDocument();
    expect(screen.getByText("Blue Period")).toBeInTheDocument();
  });

  it("sorts library by title and favorite first", async () => {
    const user = userEvent.setup();
    renderLibrary();

    await screen.findByText("Chainsaw Man");
    await user.selectOptions(screen.getByLabelText("Sort library"), "title");
    expect(screen.getAllByText(/Blue Period|Chainsaw Man|manga-missing/)[0]).toHaveTextContent("Blue Period");

    await user.selectOptions(screen.getByLabelText("Sort library"), "favorite");
    expect(screen.getAllByText(/Blue Period|Chainsaw Man|manga-missing/)[0]).toHaveTextContent("Chainsaw Man");
  });

  it("keeps tab filters and continue links working", async () => {
    const user = userEvent.setup();
    renderLibrary();

    await user.click(await screen.findByRole("button", { name: "Completed" }));
    expect(screen.getByText("A Silent Voice")).toBeInTheDocument();
    expect(screen.queryByText("Chainsaw Man")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Continue chapter/ })).toHaveAttribute("href", "/read/chapter-3?mangaId=manga-3");

    await user.click(screen.getByRole("button", { name: "Favorites" }));
    expect(screen.getByText("Chainsaw Man")).toBeInTheDocument();
    expect(screen.queryByText("A Silent Voice")).not.toBeInTheDocument();
  });
});

function renderLibrary() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <LibraryPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function makeLibraryItem(input: {
  id: string;
  mangaId: string;
  title: string;
  status: LibraryItem["status"];
  tags: string[];
  isFavorite: boolean;
  chapterId: string;
  pageIndex: number;
  activityAt: string;
  manga?: LibraryItem["manga"];
}): LibraryItem {
  return {
    id: input.id,
    userId: "user-1",
    mangaId: input.mangaId,
    status: input.status,
    isFavorite: input.isFavorite,
    lastChapterId: input.chapterId,
    lastReadAt: input.activityAt,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: input.activityAt,
    manga:
      input.manga === undefined
        ? {
            id: input.mangaId,
            title: input.title,
            coverUrl: "/api/covers/manga/cover.jpg",
            status: "ongoing",
            year: 2024,
            tags: input.tags
          }
        : input.manga,
    readingProgress: {
      id: `progress-${input.id}`,
      userId: "user-1",
      mangaId: input.mangaId,
      chapterId: input.chapterId,
      pageIndex: input.pageIndex,
      completed: input.status === "COMPLETED",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: input.activityAt
    }
  };
}
