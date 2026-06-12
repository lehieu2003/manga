import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FloatingChatWidget } from "@/features/chat/components/FloatingChatWidget";

const mocks = vi.hoisted(() => ({
  sendChatMessage: vi.fn(),
  navigate: vi.fn()
}));

vi.mock("@/api", () => ({
  assetUrl: (url: string) => url,
  api: {
    sendChatMessage: mocks.sendChatMessage
  }
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mocks.navigate
  };
});

describe("FloatingChatWidget", () => {
  beforeEach(() => {
    mocks.sendChatMessage.mockReset();
    mocks.navigate.mockReset();
  });

  it("sends a starter prompt and renders assistant sources", async () => {
    const user = userEvent.setup();
    mocks.sendChatMessage.mockResolvedValue({
      conversationId: "conversation-1",
      message: {
        id: "assistant-1",
        role: "assistant",
        content: "Try Bloom Shelf because it is completed romance.",
        sources: [{ type: "manga", id: "manga-1", title: "Bloom Shelf", reason: "Matched tags", coverUrl: "https://example.com/cover.jpg", score: 0.91 }],
        suggestedActions: [],
        createdAt: new Date().toISOString()
      }
    });

    const { container } = render(
      <MemoryRouter>
        <FloatingChatWidget />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: "Open manga assistant" }));
    await user.click(screen.getByRole("button", { name: "Recommend something completed." }));

    expect(mocks.sendChatMessage).toHaveBeenCalledWith({
      conversationId: undefined,
      message: "Recommend something completed.",
      routeContext: undefined
    });
    expect(await screen.findByText("Try Bloom Shelf because it is completed romance.")).toBeInTheDocument();
    expect(container.querySelector(".chat-source-cover img")).toHaveAttribute("src", "https://example.com/cover.jpg");

    await user.click(screen.getByRole("button", { name: /Bloom Shelf/i }));
    expect(mocks.navigate).toHaveBeenCalledWith("/manga/manga-1");
  });

  it("shows retry when the chat request fails", async () => {
    const user = userEvent.setup();
    mocks.sendChatMessage.mockRejectedValue(new Error("RAG chat requires OPENAI_API_KEY"));

    render(
      <MemoryRouter>
        <FloatingChatWidget />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: "Open manga assistant" }));
    await user.type(screen.getByLabelText("Chat message"), "Recommend action");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => expect(screen.getByText("RAG chat requires OPENAI_API_KEY")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /Retry/i })).toBeInTheDocument();
  });
});
