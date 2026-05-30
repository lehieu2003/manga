import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ChapterList } from "../components/ChapterList";
import type { ChapterSummary, ReadingProgress } from "../types";

const chapters: ChapterSummary[] = [
  { id: "chapter-1", title: "Start", chapter: "1", volume: null, translatedLanguage: "en", publishAt: "2024-01-01T00:00:00.000Z", pages: 12, scanlationGroup: "Group A" },
  { id: "chapter-4", title: "Current Turn", chapter: "4", volume: null, translatedLanguage: "vi", publishAt: "2024-01-04T00:00:00.000Z", pages: 18, scanlationGroup: "Group B" },
  { id: "chapter-5", title: "Aftermath", chapter: "5", volume: null, translatedLanguage: "en", publishAt: "2024-01-05T00:00:00.000Z", pages: 20, scanlationGroup: "Group C" },
  { id: "chapter-123", title: "Jump Target", chapter: "123", volume: null, translatedLanguage: "en", publishAt: "2024-02-01T00:00:00.000Z", pages: 24, scanlationGroup: "Group D" }
];

const currentProgress: ReadingProgress = {
  id: "progress-4",
  userId: "user-1",
  mangaId: "manga-1",
  chapterId: "chapter-4",
  pageIndex: 16,
  completed: false,
  createdAt: "2024-01-04T00:00:00.000Z",
  updatedAt: "2024-01-04T00:00:00.000Z"
};

describe("ChapterList", () => {
  it("renders reading states, language badges, current highlight, and search", async () => {
    render(
      <MemoryRouter>
        <ChapterList chapters={chapters} mangaId="manga-1" currentProgress={currentProgress} chaptersProgress={[{ ...currentProgress }, { ...currentProgress, id: "progress-1", chapterId: "chapter-1", completed: true }]} />
      </MemoryRouter>
    );

    expect(screen.getByText("✓ Read")).toBeInTheDocument();
    expect(screen.getByText("▶ Current")).toBeInTheDocument();
    expect(screen.getByText("● New")).toBeInTheDocument();
    expect(screen.getAllByText("[EN]").length).toBeGreaterThan(0);
    expect(screen.getByText("[VI]")).toBeInTheDocument();
    expect(screen.getByText("Current Reading")).toBeInTheDocument();
    expect(screen.getByText("NEW")).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText("Search chapter..."), "123");
    expect(screen.getByText("Chapter 123")).toBeInTheDocument();
    expect(screen.queryByText("Chapter 4")).not.toBeInTheDocument();
  });

  it("sorts newest first by default and toggles to oldest first", async () => {
    render(
      <MemoryRouter>
        <ChapterList chapters={chapters.slice(0, 3)} mangaId="manga-1" />
      </MemoryRouter>
    );

    expect(screen.getAllByText(/Chapter /)[0]).toHaveTextContent("Chapter 5");
    await userEvent.click(screen.getByRole("button", { name: "↓ Newest First" }));
    expect(screen.getAllByText(/Chapter /)[0]).toHaveTextContent("Chapter 1");
  });

  it("calls load more without losing list controls", async () => {
    const onLoadMore = vi.fn();
    render(
      <MemoryRouter>
        <ChapterList chapters={chapters.slice(0, 2)} mangaId="manga-1" hasMore onLoadMore={onLoadMore} />
      </MemoryRouter>
    );

    await userEvent.click(screen.getByRole("button", { name: "Load more chapters" }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
    expect(screen.getByPlaceholderText("Search chapter...")).toBeInTheDocument();
  });
});
