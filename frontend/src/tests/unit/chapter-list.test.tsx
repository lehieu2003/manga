import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChapterList } from "@/features/catalog/components/ChapterList";
import { dedupeChapters, getCollapsedChapters, groupChaptersByVolume } from "@/features/catalog/chapter-list/chapter-list.logic";
import type { ChapterSummary, ReadingProgress } from "@/types";

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

function makeChapter(overrides: Partial<ChapterSummary> & Pick<ChapterSummary, "id">): ChapterSummary {
  return {
    title: `Title ${overrides.chapter ?? overrides.id}`,
    chapter: "1",
    volume: null,
    translatedLanguage: "en",
    publishAt: "2024-01-01T00:00:00.000Z",
    pages: 12,
    scanlationGroup: "Group A",
    ...overrides
  };
}

function makeManyChapters(count: number): ChapterSummary[] {
  return Array.from({ length: count }, (_, index) => {
    const chapterNumber = index + 1;
    return makeChapter({
      id: `many-${chapterNumber}`,
      title: "Shared long list title",
      chapter: String(chapterNumber),
      volume: chapterNumber > 20 ? "2" : "1",
      translatedLanguage: "en",
      publishAt: `2024-01-${String(Math.min(chapterNumber, 28)).padStart(2, "0")}T00:00:00.000Z`,
      scanlationGroup: "Group A"
    });
  });
}

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  callback: IntersectionObserverCallback;
  elements: Element[] = [];

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }

  observe = (element: Element) => {
    this.elements.push(element);
  };

  disconnect = vi.fn();
  unobserve = vi.fn();
  takeRecords = vi.fn(() => []);

  trigger() {
    const target = this.elements[0];
    if (!target) throw new Error("No observed sentinel");
    this.callback([{ target, isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }
}

describe("ChapterList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockIntersectionObserver.instances = [];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders reading states, language badges, current highlight, and search", async () => {
    render(
      <MemoryRouter>
        <ChapterList
          chapters={chapters}
          mangaId="manga-1"
          currentProgress={currentProgress}
          chaptersProgress={[{ ...currentProgress }, { ...currentProgress, id: "progress-1", chapterId: "chapter-1", completed: true }]}
          selectedLanguages={["vi", "en"]}
          onSelectedLanguagesChange={vi.fn()}
        />
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
        <ChapterList chapters={chapters.slice(0, 3)} mangaId="manga-1" selectedLanguages={["vi", "en"]} onSelectedLanguagesChange={vi.fn()} />
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
        <ChapterList chapters={chapters.slice(0, 2)} mangaId="manga-1" selectedLanguages={["vi", "en"]} onSelectedLanguagesChange={vi.fn()} hasMore onLoadMore={onLoadMore} />
      </MemoryRouter>
    );

    await userEvent.click(screen.getByRole("button", { name: "Load more" }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
    expect(screen.getByPlaceholderText("Search chapter...")).toBeInTheDocument();
  });

  it("loads more when the infinite-scroll sentinel is visible", () => {
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    const onLoadMore = vi.fn();
    render(
      <MemoryRouter>
        <ChapterList chapters={chapters.slice(0, 2)} mangaId="manga-1" selectedLanguages={["vi", "en"]} onSelectedLanguagesChange={vi.fn()} hasMore onLoadMore={onLoadMore} />
      </MemoryRouter>
    );

    MockIntersectionObserver.instances[0].trigger();
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it("sends chapter search to the server query without auto-fetching another page", async () => {
    const onLoadMore = vi.fn();
    const onChapterSearchChange = vi.fn();
    render(
      <MemoryRouter>
        <ChapterList
          chapters={chapters.slice(0, 2)}
          mangaId="manga-1"
          selectedLanguages={["vi", "en"]}
          onSelectedLanguagesChange={vi.fn()}
          onChapterSearchChange={onChapterSearchChange}
          hasMore
          onLoadMore={onLoadMore}
        />
      </MemoryRouter>
    );

    await userEvent.type(screen.getByPlaceholderText("Search chapter..."), "123");
    expect(onChapterSearchChange).toHaveBeenLastCalledWith("123");
    expect(onLoadMore).not.toHaveBeenCalled();
    expect(screen.queryByText("Searching more chapters...")).not.toBeInTheDocument();
  });

  it("filters by scanlation group and clears filters", async () => {
    const onSelectedLanguagesChange = vi.fn();
    render(
      <MemoryRouter>
        <ChapterList chapters={chapters} mangaId="manga-1" selectedLanguages={["vi", "en"]} onSelectedLanguagesChange={onSelectedLanguagesChange} />
      </MemoryRouter>
    );

    await userEvent.click(screen.getByLabelText(/Group B/));
    expect(screen.getByText("Chapter 4")).toBeInTheDocument();
    expect(screen.queryByText("Chapter 1")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Clear filters/ }));
    expect(onSelectedLanguagesChange).toHaveBeenCalledWith(["vi", "en"]);
    expect(screen.getByText("Chapter 1")).toBeInTheDocument();
  });

  it("emits language checkbox changes and keeps controls visible with no language selected", async () => {
    const onSelectedLanguagesChange = vi.fn();
    const { rerender } = render(
      <MemoryRouter>
        <ChapterList chapters={chapters} mangaId="manga-1" selectedLanguages={["vi"]} onSelectedLanguagesChange={onSelectedLanguagesChange} />
      </MemoryRouter>
    );

    await userEvent.click(screen.getByLabelText("VI"));
    expect(onSelectedLanguagesChange).toHaveBeenCalledWith([]);

    rerender(
      <MemoryRouter>
        <ChapterList chapters={[]} mangaId="manga-1" selectedLanguages={[]} onSelectedLanguagesChange={onSelectedLanguagesChange} />
      </MemoryRouter>
    );
    expect(screen.getByText("Select at least one language to load chapters.")).toBeInTheDocument();
    expect(screen.getByLabelText("VI")).toBeInTheDocument();
    expect(screen.getByLabelText("EN")).toBeInTheDocument();
  });

  it("dedupes chapters by language, scanlation group, publish date, and id fallback", () => {
    const dedupedByLanguage = dedupeChapters(
      [
        makeChapter({ id: "chapter-10-en", chapter: "10", translatedLanguage: "en", publishAt: "2024-01-03T00:00:00.000Z" }),
        makeChapter({ id: "chapter-10-vi", chapter: "10", translatedLanguage: "vi", publishAt: "2024-01-01T00:00:00.000Z" })
      ],
      { languagePriority: ["vi", "en"], selectedScanlationGroups: [] }
    );
    expect(dedupedByLanguage).toHaveLength(1);
    expect(dedupedByLanguage[0].id).toBe("chapter-10-vi");

    const dedupedByGroup = dedupeChapters(
      [
        makeChapter({ id: "chapter-11-a", chapter: "11", translatedLanguage: "en", scanlationGroup: "Group A", publishAt: "2024-01-04T00:00:00.000Z" }),
        makeChapter({ id: "chapter-11-b", chapter: "11", translatedLanguage: "en", scanlationGroup: "Group B", publishAt: "2024-01-03T00:00:00.000Z" })
      ],
      { languagePriority: ["en"], selectedScanlationGroups: ["Group B"] }
    );
    expect(dedupedByGroup[0].id).toBe("chapter-11-b");

    const dedupedByDate = dedupeChapters(
      [
        makeChapter({ id: "chapter-12-old", chapter: "12", translatedLanguage: "en", publishAt: "2024-01-01T00:00:00.000Z" }),
        makeChapter({ id: "chapter-12-new", chapter: "12", translatedLanguage: "en", publishAt: "2024-01-05T00:00:00.000Z" })
      ],
      { languagePriority: ["en"], selectedScanlationGroups: [] }
    );
    expect(dedupedByDate[0].id).toBe("chapter-12-new");
  });

  it("groups chapters by volume and keeps no-volume chapters last", () => {
    const grouped = groupChaptersByVolume(
      [
        makeChapter({ id: "chapter-1", chapter: "1", volume: "1" }),
        makeChapter({ id: "chapter-2", chapter: "2", volume: "2" }),
        makeChapter({ id: "chapter-extra", chapter: "Extra", volume: null })
      ],
      "newest"
    );

    expect(grouped.map((group) => group.title)).toEqual(["Volume 2", "Volume 1", "No Volume"]);
  });

  it("collapses long chapter lists unless search is active", () => {
    const longList = makeManyChapters(35);

    expect(getCollapsedChapters(longList, { chapterSearch: "", isExpanded: false })).toMatchObject({
      isCollapsible: true,
      isCollapsed: true,
      totalCount: 35,
      visibleCount: 20
    });
    expect(getCollapsedChapters(longList, { chapterSearch: "shared", isExpanded: false })).toMatchObject({
      isCollapsible: false,
      isCollapsed: false,
      totalCount: 35,
      visibleCount: 35
    });
  });

  it("renders volume groups and dedupes duplicate chapter rows", () => {
    render(
      <MemoryRouter>
        <ChapterList
          chapters={[
            makeChapter({ id: "chapter-1-en", chapter: "1", volume: "1", translatedLanguage: "en" }),
            makeChapter({ id: "chapter-1-vi", chapter: "1", volume: "1", translatedLanguage: "vi" }),
            makeChapter({ id: "chapter-2", chapter: "2", volume: "2", translatedLanguage: "en" }),
            makeChapter({ id: "chapter-extra", chapter: "Extra", volume: null, translatedLanguage: "en" })
          ]}
          mangaId="manga-1"
          selectedLanguages={["vi", "en"]}
          onSelectedLanguagesChange={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(screen.getByText("Volume 2")).toBeInTheDocument();
    expect(screen.getByText("Volume 1")).toBeInTheDocument();
    expect(screen.getByText("No Volume")).toBeInTheDocument();
    expect(screen.getAllByText("Chapter 1")).toHaveLength(1);
    expect(screen.getByText("[VI]")).toBeInTheDocument();
  });

  it("expands and collapses long chapter lists", async () => {
    render(
      <MemoryRouter>
        <ChapterList chapters={makeManyChapters(35)} mangaId="manga-1" selectedLanguages={["en"]} onSelectedLanguagesChange={vi.fn()} />
      </MemoryRouter>
    );

    expect(screen.getByText("Showing 20 of 35 chapters")).toBeInTheDocument();
    expect(screen.queryByText("Chapter 15")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Show all chapters" }));
    expect(screen.getByText("Chapter 15")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Show fewer" }));
    expect(screen.queryByText("Chapter 15")).not.toBeInTheDocument();
  });

  it("does not collapse active search results", async () => {
    render(
      <MemoryRouter>
        <ChapterList chapters={makeManyChapters(35)} mangaId="manga-1" selectedLanguages={["en"]} onSelectedLanguagesChange={vi.fn()} />
      </MemoryRouter>
    );

    await userEvent.type(screen.getByPlaceholderText("Search chapter..."), "Shared long list title");
    expect(screen.queryByRole("button", { name: "Show all chapters" })).not.toBeInTheDocument();
    expect(screen.getAllByText(/Chapter /)).toHaveLength(35);
  });
});
