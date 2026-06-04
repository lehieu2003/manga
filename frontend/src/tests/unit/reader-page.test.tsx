import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api";
import { ReaderPage } from "@/features/catalog/pages/ReaderPage";
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
    user: { id: "user-1", email: "reader@example.com", displayName: "Reader", avatarUrl: null, createdAt: "2024-01-01T00:00:00.000Z" }
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
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}
