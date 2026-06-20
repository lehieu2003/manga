import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api";
import { ReaderPage } from "@/features/catalog/pages/ReaderPage";
import { READER_SETTINGS_STORAGE_KEY } from "@/features/catalog/reader/readerSettings";
import type { ChapterSummary } from "@/types";

const chapters: ChapterSummary[] = [
  { id: "chapter-1", title: "Start", chapter: "1", volume: null, translatedLanguage: "en", publishAt: "2024-01-01T00:00:00.000Z", pages: 3, scanlationGroup: "Group A" },
  { id: "chapter-2", title: "Middle", chapter: "2", volume: null, translatedLanguage: "vi", publishAt: "2024-01-02T00:00:00.000Z", pages: 3, scanlationGroup: "Group A" },
  { id: "chapter-3", title: "End", chapter: "3", volume: null, translatedLanguage: "en", publishAt: "2024-01-03T00:00:00.000Z", pages: 3, scanlationGroup: "Group A" }
];

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

  trigger(pageIndex: number) {
    const target = this.elements.find((element) => element.getAttribute("data-page-index") === String(pageIndex));
    if (!target) throw new Error(`Page ${pageIndex} was not observed`);
    this.callback([{ target, isIntersecting: true, intersectionRatio: 0.8 } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }
}

vi.mock("@/features/auth/stores/auth.store", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "reader@example.com", displayName: "Reader", role: "USER", avatarUrl: null, createdAt: "2024-01-01T00:00:00.000Z" }
  })
}));

vi.mock("@/api", async () => {
  const actual = await vi.importActual<typeof import("@/api")>("@/api");
  return {
    ...actual,
    api: {
      getReader: vi.fn(async (chapterId: string) => ({
        baseUrl: "https://uploads.mangadex.dev",
        hash: "hash",
        pages: [`${chapterId}-1.jpg`, `${chapterId}-2.jpg`, `${chapterId}-3.jpg`],
        dataSaverPages: [`${chapterId}-1-saver.jpg`, `${chapterId}-2-saver.jpg`, `${chapterId}-3-saver.jpg`],
        pageUrls: [`/api/pages/${chapterId}/data/${chapterId}-1.jpg`, `/api/pages/${chapterId}/data/${chapterId}-2.jpg`, `/api/pages/${chapterId}/data/${chapterId}-3.jpg`],
        dataSaverPageUrls: [
          `/api/pages/${chapterId}/data-saver/${chapterId}-1-saver.jpg`,
          `/api/pages/${chapterId}/data-saver/${chapterId}-2-saver.jpg`,
          `/api/pages/${chapterId}/data-saver/${chapterId}-3-saver.jpg`
        ]
      })),
      getChapters: vi.fn(async () => ({ data: chapters, limit: 100, offset: 0, total: chapters.length })),
      getChapterBookmark: vi.fn(async () => ({ bookmark: null })),
      createBookmark: vi.fn(async (input: { mangaId: string; chapterId: string; pageIndex: number }) => ({
        bookmark: {
          id: "bookmark-1",
          userId: "user-1",
          note: null,
          isFavorite: false,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
          ...input
        }
      })),
      removeBookmark: vi.fn(async () => ({ ok: true })),
      getMangaProgress: vi.fn(async () => ({
        progress: null,
        chaptersProgress: [
          {
            id: "progress-1",
            userId: "user-1",
            mangaId: "manga-1",
            chapterId: "chapter-1",
            pageIndex: 2,
            completed: true,
            createdAt: "2024-01-01T00:00:00.000Z",
            updatedAt: "2024-01-01T00:00:00.000Z"
          }
        ]
      })),
      saveProgress: vi.fn(async () => ({ ok: true }))
    }
  };
});

describe("ReaderPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    MockIntersectionObserver.instances = [];
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("renders chapter navigation and moves to the next chapter route", async () => {
    const user = userEvent.setup();
    renderReader("/read/chapter-2?mangaId=manga-1");

    expect(await screen.findByText("Page 1 / 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous chapter" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Next chapter" })).toBeEnabled();
    expect(screen.getByRole("combobox", { name: "Select chapter" })).toHaveValue("chapter-2");
    expect(screen.getByRole("option", { name: "✓ Chapter 1 [EN] - Start" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "▶ Chapter 2 [VI] - Middle" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next chapter" }));
    expect(await screen.findByTestId("location")).toHaveTextContent("/read/chapter-3?mangaId=manga-1");
  });

  it("disables navigation at chapter feed boundaries", async () => {
    renderReader("/read/chapter-1?mangaId=manga-1");

    expect(await screen.findByRole("combobox", { name: "Select chapter" })).toHaveValue("chapter-1");
    expect(screen.getByRole("button", { name: "Previous chapter" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next chapter" })).toBeEnabled();
  });

  it("lets the chapter selector navigate directly", async () => {
    const user = userEvent.setup();
    renderReader("/read/chapter-2?mangaId=manga-1");

    await user.selectOptions(await screen.findByRole("combobox", { name: "Select chapter" }), "chapter-1");
    expect(await screen.findByTestId("location")).toHaveTextContent("/read/chapter-1?mangaId=manga-1");
  });

  it("keeps the reader usable and disables chapter navigation when mangaId is missing", async () => {
    renderReader("/read/chapter-2");

    expect(await screen.findByText("Page 1 / 3")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Select chapter" })).toBeDisabled();
    expect(screen.getByRole("option", { name: "Chapter navigation unavailable" })).toBeInTheDocument();
    expect(api.getChapters).not.toHaveBeenCalled();
  });

  it("toggles between data saver and original page URLs", async () => {
    const user = userEvent.setup();
    renderReader("/read/chapter-2?mangaId=manga-1");

    const firstPage = await screen.findByAltText("Page 1");
    expect(firstPage).toHaveAttribute("src", expect.stringContaining("/data-saver/chapter-2-1-saver.jpg"));

    await user.click(screen.getByRole("button", { name: "Toggle reader quality" }));

    expect(await screen.findByAltText("Page 1")).toHaveAttribute("src", expect.stringContaining("/data/chapter-2-1.jpg"));
    expect(screen.getByRole("button", { name: "Toggle reader quality" })).toHaveTextContent("Original");
  });

  it("bookmarks the current reader page", async () => {
    const user = userEvent.setup();
    localStorage.setItem(READER_SETTINGS_STORAGE_KEY, JSON.stringify({ mode: "paged", fit: "width", quality: "data-saver" }));
    renderReader("/read/chapter-2?mangaId=manga-1");

    expect(await screen.findByText("Page 1 / 3")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText("Page 2 / 3")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Bookmark current page" }));

    await waitFor(() => {
      expect(api.createBookmark).toHaveBeenCalledWith({ mangaId: "manga-1", chapterId: "chapter-2", pageIndex: 1, isFavorite: false });
    });
  });

  it("loads and persists device reader settings", async () => {
    const user = userEvent.setup();
    localStorage.setItem(READER_SETTINGS_STORAGE_KEY, JSON.stringify({ mode: "paged", fit: "contain", quality: "original", navigationDirection: "rtl" }));
    renderReader("/read/chapter-2?mangaId=manga-1");

    expect(await screen.findByAltText("Page 1")).toHaveAttribute("src", expect.stringContaining("/data/chapter-2-1.jpg"));
    expect(screen.getByRole("button", { name: "Toggle reader quality" })).toHaveTextContent("Original");
    expect(screen.getByRole("button", { name: "Toggle page direction" })).toHaveTextContent("RTL");
    expect(screen.getAllByAltText(/Page /)).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Vertical mode" }));
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem(READER_SETTINGS_STORAGE_KEY) ?? "{}")).toMatchObject({
        mode: "vertical",
        fit: "contain",
        quality: "original",
        navigationDirection: "rtl"
      });
    });
  });

  it("falls back when stored reader settings contain invalid values", async () => {
    localStorage.setItem(READER_SETTINGS_STORAGE_KEY, JSON.stringify({ mode: "book", fit: "stretch", quality: "raw", navigationDirection: "down" }));
    renderReader("/read/chapter-2?mangaId=manga-1");

    expect(await screen.findByText("Page 1 / 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Toggle reader quality" })).toHaveTextContent("Data saver");
    expect(screen.getByRole("button", { name: "Toggle page direction" })).toHaveTextContent("LTR");
    expect(screen.getAllByAltText(/Page /)).toHaveLength(3);
  });

  it("moves pages with left-to-right paged tap zones", async () => {
    const user = userEvent.setup();
    localStorage.setItem(READER_SETTINGS_STORAGE_KEY, JSON.stringify({ mode: "paged", fit: "width", quality: "data-saver" }));
    renderReader("/read/chapter-2?mangaId=manga-1");

    expect(await screen.findByText("Page 1 / 3")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Right page tap zone" }));
    expect(await screen.findByText("Page 2 / 3")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Left page tap zone" }));
    expect(await screen.findByText("Page 1 / 3")).toBeInTheDocument();
  });

  it("moves pages with visible previous and next buttons", async () => {
    const user = userEvent.setup();
    localStorage.setItem(READER_SETTINGS_STORAGE_KEY, JSON.stringify({ mode: "paged", fit: "width", quality: "data-saver" }));
    renderReader("/read/chapter-2?mangaId=manga-1");

    expect(await screen.findByText("Page 1 / 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText("Page 2 / 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Previous" }));
    expect(await screen.findByText("Page 1 / 3")).toBeInTheDocument();
  });

  it("moves pages with right-to-left paged tap zones and arrow keys", async () => {
    const user = userEvent.setup();
    localStorage.setItem(READER_SETTINGS_STORAGE_KEY, JSON.stringify({ mode: "paged", fit: "width", quality: "data-saver", navigationDirection: "rtl" }));
    renderReader("/read/chapter-2?mangaId=manga-1");

    expect(await screen.findByText("Page 1 / 3")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Left page tap zone" }));
    expect(await screen.findByText("Page 2 / 3")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(await screen.findByText("Page 1 / 3")).toBeInTheDocument();
  });

  it("moves pages with horizontal swipe gestures in paged mode", async () => {
    localStorage.setItem(READER_SETTINGS_STORAGE_KEY, JSON.stringify({ mode: "paged", fit: "width", quality: "data-saver" }));
    const { container } = renderReader("/read/chapter-2?mangaId=manga-1");

    expect(await screen.findByText("Page 1 / 3")).toBeInTheDocument();
    const canvas = container.querySelector(".reader-paged-canvas");
    expect(canvas).not.toBeNull();

    fireEvent.pointerDown(canvas as Element, { clientX: 220, clientY: 120 });
    fireEvent.pointerUp(canvas as Element, { clientX: 120, clientY: 124 });
    expect(await screen.findByText("Page 2 / 3")).toBeInTheDocument();

    fireEvent.pointerDown(canvas as Element, { clientX: 120, clientY: 120 });
    fireEvent.pointerUp(canvas as Element, { clientX: 220, clientY: 124 });
    expect(await screen.findByText("Page 1 / 3")).toBeInTheDocument();
  });

  it("shows reader shortcut help from the toolbar", async () => {
    const user = userEvent.setup();
    renderReader("/read/chapter-2?mangaId=manga-1");

    await screen.findByText("Page 1 / 3");
    await user.click(screen.getByRole("button", { name: "Reader shortcuts" }));

    expect(screen.getByRole("tooltip")).toHaveTextContent("Reader controls");
    expect(screen.getByText("Left / right tap")).toBeInTheDocument();
    expect(screen.getByText("Swipe left / right")).toBeInTheDocument();
    expect(screen.getByText("Arrow keys")).toBeInTheDocument();
  });

  it("shows shortcut help for right-to-left page direction", async () => {
    const user = userEvent.setup();
    localStorage.setItem(READER_SETTINGS_STORAGE_KEY, JSON.stringify({ mode: "paged", fit: "width", quality: "data-saver", navigationDirection: "rtl" }));
    renderReader("/read/chapter-2?mangaId=manga-1");

    await screen.findByText("Page 1 / 3");
    await user.click(screen.getByRole("button", { name: "Reader shortcuts" }));

    expect(screen.getByText("left tap goes next; right tap goes back in paged mode.")).toBeInTheDocument();
    expect(screen.getByText("Swipe right goes next; swipe left goes back in paged mode.")).toBeInTheDocument();
  });

  it("saves vertical progress from the observed viewport page", async () => {
    renderReader("/read/chapter-2?mangaId=manga-1");

    expect(await screen.findByAltText("Page 3")).toBeInTheDocument();
    act(() => {
      MockIntersectionObserver.instances[0].trigger(2);
    });

    expect(await screen.findByText("Page 3 / 3")).toBeInTheDocument();
    await waitFor(() => {
      expect(api.saveProgress).toHaveBeenCalledWith("chapter-2", { mangaId: "manga-1", pageIndex: 2, completed: true });
    }, { timeout: 1500 });
  });

  it("offers another source when the selected chapter is unavailable", async () => {
    const user = userEvent.setup();
    vi.mocked(api.getReader).mockRejectedValueOnce(new Error("MangaDex request failed: Not Found"));
    vi.mocked(api.getChapters).mockResolvedValueOnce({
      data: [...chapters, { ...chapters[1], id: "chapter-2-alt", scanlationGroup: "Group B" }],
      limit: 100,
      offset: 0,
      total: 4
    });

    renderReader("/read/chapter-2?mangaId=manga-1");

    expect(await screen.findByRole("heading", { name: "This chapter source cannot be opened right now." })).toBeInTheDocument();
    expect(screen.getByText("MangaDex request failed: Not Found")).toBeInTheDocument();
    expect(screen.getByText("Why did this happen?")).toBeInTheDocument();
    expect(api.getReader).toHaveBeenCalledWith("chapter-2");
    await user.click(screen.getByRole("button", { name: "Open another source" }));
    expect(await screen.findByTestId("location")).toHaveTextContent("/read/chapter-2-alt?mangaId=manga-1");
  });

  it("links back to chapters when an unavailable direct reader URL has no fallback source", async () => {
    const user = userEvent.setup();
    vi.mocked(api.getReader).mockRejectedValueOnce(new Error("MangaDex request failed: Not Found"));
    vi.mocked(api.getChapters).mockResolvedValueOnce({
      data: chapters.filter((chapter) => chapter.id !== "chapter-2"),
      limit: 100,
      offset: 0,
      total: 2
    });

    renderReader("/read/chapter-2?mangaId=manga-1");

    expect(await screen.findByRole("heading", { name: "This chapter source cannot be opened right now." })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open another source" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Back to chapters" }));
    expect(await screen.findByTestId("location")).toHaveTextContent("/manga/manga-1");
    expect(api.getReader).toHaveBeenCalledWith("chapter-2");
  });
});

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

function renderReader(initialEntry: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route
            path="/read/:chapterId"
            element={
              <>
                <LocationProbe />
                <ReaderPage />
              </>
            }
          />
          <Route path="/manga/:mangaId" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}
