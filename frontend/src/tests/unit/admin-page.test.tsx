import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminPage } from "@/features/admin/pages/AdminPage";

const apiMocks = vi.hoisted(() => ({
  getOverview: vi.fn(),
  getRagStatus: vi.fn(),
  listRagDocuments: vi.fn(),
  reindexRag: vi.fn()
}));

const authState = vi.hoisted(() => ({
  user: null as null | { id: string; email: string; displayName: string; role: "USER" | "ADMIN"; avatarUrl: string | null; emailVerifiedAt: string | null; hasPassword: boolean; createdAt: string },
  isLoading: false
}));

vi.mock("@/api", async () => {
  const actual = await vi.importActual<typeof import("@/api")>("@/api");
  return {
    ...actual,
    api: {
      ...actual.api,
      admin: {
        ...actual.api.admin,
        getOverview: apiMocks.getOverview,
        getRagStatus: apiMocks.getRagStatus,
        listRagDocuments: apiMocks.listRagDocuments,
        reindexRag: apiMocks.reindexRag
      }
    }
  };
});

vi.mock("@/features/auth/stores/auth.store", () => ({
  useAuth: () => ({ user: authState.user, isLoading: authState.isLoading })
}));

describe("AdminPage", () => {
  beforeEach(() => {
    sessionStorage.clear();
    authState.user = null;
    authState.isLoading = false;
    apiMocks.getOverview.mockReset().mockResolvedValue({
      users: 2,
      activeSessions: 1,
      cachedManga: 3,
      cachedChapters: 4,
      libraryItems: 5,
      readingProgress: 6,
      searchHistory: 7,
      latestCatalogFetchAt: null
    });
    apiMocks.getRagStatus.mockReset().mockResolvedValue({
      cached: { manga: 100, chapters: 2500 },
      ragDocuments: {
        total: 120,
        manga: 100,
        chapter: 20,
        latestIndexedAt: "2026-06-12T00:00:00.000Z",
        embeddingModel: "text-embedding-3-small"
      },
      chat: { activeConversations: 3, messages: 42 },
      coverage: { mangaIndexed: 1, chapterIndexed: 0.008 }
    });
    apiMocks.listRagDocuments.mockReset().mockResolvedValue({
      data: [
        {
          id: "rag_1",
          sourceType: "MANGA",
          sourceId: "manga_1",
          parentSourceId: null,
          title: "Solo Leveling",
          contentPreview: "Action fantasy hunter leveling catalog text.",
          metadata: {},
          contentHash: "hash",
          embeddingModel: "text-embedding-3-small",
          indexedAt: "2026-06-12T00:00:00.000Z",
          updatedAt: "2026-06-12T00:00:00.000Z"
        }
      ],
      limit: 25,
      offset: 0,
      total: 1
    });
    apiMocks.reindexRag.mockReset().mockResolvedValue({
      status: "completed",
      summary: { created: 1, updated: 2, skipped: 3, failed: 0 },
      durationMs: 1200
    });
  });

  it("stores an admin token in session storage", async () => {
    const user = userEvent.setup();
    renderAdmin();

    await user.type(screen.getByLabelText("Admin token"), "admin-sync-token");
    await user.click(screen.getByRole("button", { name: "Unlock admin" }));

    expect(sessionStorage.getItem("manga.adminToken")).toBe("admin-sync-token");
    expect(await screen.findByText("Data operations")).toBeInTheDocument();
  });

  it("renders overview counts for an admin account", async () => {
    authState.user = makeUser("ADMIN");
    renderAdmin();

    expect((await screen.findAllByText("Cached chapters")).length).toBeGreaterThan(0);
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getAllByText("4").length).toBeGreaterThan(0);
  });

  it("renders RAG ops and runs reindex", async () => {
    const user = userEvent.setup();
    authState.user = makeUser("ADMIN");
    renderAdmin();

    await user.click(await screen.findByRole("button", { name: /Index and inspect/i }));

    expect(await screen.findByText("RAG re-index")).toBeInTheDocument();
    expect(screen.getByText("Manga docs")).toBeInTheDocument();
    expect(screen.getByText("Solo Leveling")).toBeInTheDocument();

    await user.click(screen.getByLabelText("Include chapter docs"));
    await user.click(screen.getByRole("button", { name: "Run RAG index" }));

    expect(apiMocks.reindexRag.mock.calls[0]?.[0]).toEqual({ limit: 50, chapters: true });
    expect(await screen.findByText(/Indexed 1 created, 2 updated, 3 skipped, 0 failed/)).toBeInTheDocument();
  });

  it("blocks non-admin accounts", async () => {
    authState.user = makeUser("USER");
    renderAdmin();

    expect(await screen.findByText("Admin role required")).toBeInTheDocument();
  });
});

function makeUser(role: "USER" | "ADMIN") {
  return {
    id: "user-1",
    email: "reader@example.com",
    displayName: "Reader",
    role,
    avatarUrl: null,
    emailVerifiedAt: "2024-01-01T00:00:00.000Z",
    hasPassword: true,
    createdAt: "2024-01-01T00:00:00.000Z"
  };
}

function renderAdmin() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}
