import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { LibraryPage } from "../pages/LibraryPage";

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return {
    ...actual,
    api: {
      getLibrary: vi.fn(async () => ({
        data: [
          {
            id: "library-1",
            userId: "user-1",
            mangaId: "manga-1",
            status: "READING",
            isFavorite: true,
            lastChapterId: "chapter-1",
            lastReadAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            manga: {
              id: "manga-1",
              title: "Chainsaw Man",
              coverUrl: "/api/covers/manga-1/cover.jpg",
              status: "ongoing",
              year: 2018,
              tags: ["Action"]
            },
            readingProgress: {
              id: "progress-1",
              userId: "user-1",
              mangaId: "manga-1",
              chapterId: "chapter-1",
              pageIndex: 4,
              completed: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          }
        ]
      })),
      upsertLibrary: vi.fn(),
      removeLibrary: vi.fn()
    }
  };
});

describe("LibraryPage", () => {
  it("renders cached manga metadata and continue reading state", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <LibraryPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText("Chainsaw Man")).toBeInTheDocument();
    expect(screen.getByText(/Continue chapter/)).toBeInTheDocument();
  });
});
