import { Bot, ExternalLink, MessageCircle, RotateCcw, Send, UserRound, X } from "lucide-react";
import { FormEvent, useMemo, useReducer, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, assetUrl } from "@/api";
import type { ChatMessage, ChatSource } from "@/types";

type LocalChatMessage = ChatMessage & {
  isPending?: boolean;
  isError?: boolean;
};

type ChatState = {
  isOpen: boolean;
  conversationId?: string;
  messages: LocalChatMessage[];
  pendingMessage?: string;
};

type ChatAction =
  | { type: "toggle" }
  | { type: "close" }
  | { type: "userMessage"; message: LocalChatMessage }
  | { type: "assistantMessage"; conversationId: string; message: ChatMessage }
  | { type: "requestFailed"; errorMessage: string }
  | { type: "clear" };

const starterPrompts = ["Recommend something completed.", "What should I continue reading?", "Find romance manga with school-life tags.", "Suggest something based on my library."];

export function FloatingChatWidget({ routeContext }: { routeContext?: { mangaId?: string; chapterId?: string } }) {
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [state, dispatch] = useReducer(chatReducer, { isOpen: false, messages: [] });
  const isLoading = state.messages.some((message) => message.isPending);
  const canSend = input.trim().length > 0 && !isLoading;
  const hasMessages = state.messages.length > 0;
  const panelTitle = useMemo(() => (hasMessages ? "Manga assistant" : "Ask the shelf"), [hasMessages]);

  async function submitMessage(nextMessage = input) {
    const content = nextMessage.trim();
    if (!content || isLoading) return;
    setInput("");
    const userMessage: LocalChatMessage = {
      id: `local-${Date.now()}`,
      role: "user",
      content,
      createdAt: new Date().toISOString()
    };
    dispatch({ type: "userMessage", message: userMessage });

    try {
      const response = await api.sendChatMessage({
        conversationId: state.conversationId,
        message: content,
        routeContext
      });
      dispatch({ type: "assistantMessage", conversationId: response.conversationId, message: response.message });
    } catch (error) {
      dispatch({ type: "requestFailed", errorMessage: error instanceof Error ? error.message : "Chat request failed" });
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitMessage();
  }

  function openSource(source: ChatSource) {
    navigate(source.type === "chapter" ? `/read/${source.id}` : `/manga/${source.id}`);
    dispatch({ type: "close" });
  }

  return (
    <div className="chat-widget" aria-live="polite">
      {state.isOpen ? (
        <section className="chat-panel" aria-label="Manga assistant">
          <header className="chat-panel-header">
            <span className="chat-panel-mark">
              <Bot size={18} />
            </span>
            <div>
              <h2>{panelTitle}</h2>
              <p>Catalog RAG</p>
            </div>
            <button className="chat-icon-button" type="button" onClick={() => dispatch({ type: "close" })} aria-label="Close chat">
              <X size={17} />
            </button>
          </header>

          <div className="chat-message-list">
            {!hasMessages ? (
              <div className="chat-empty-state">
                {starterPrompts.map((prompt) => (
                  <button key={prompt} type="button" onClick={() => void submitMessage(prompt)}>
                    {prompt}
                  </button>
                ))}
              </div>
            ) : (
              state.messages.map((message) => (
                <article key={message.id} className={`chat-message chat-message-${message.role}${message.isError ? " chat-message-error" : ""}`}>
                  <span className="chat-avatar">{message.role === "assistant" ? <Bot size={15} /> : <UserRound size={15} />}</span>
                  <div className="chat-bubble">
                    <p>{message.content}</p>
                    {message.isPending ? <small>Thinking...</small> : null}
                    {message.isError ? (
                      <button className="chat-retry" type="button" onClick={() => void submitMessage(state.pendingMessage)}>
                        <RotateCcw size={14} />
                        Retry
                      </button>
                    ) : null}
                    {message.sources?.length ? (
                      <div className="chat-sources">
                        {message.sources.slice(0, 4).map((source) => (
                          <button key={`${source.type}-${source.id}`} className="chat-source-card" type="button" onClick={() => openSource(source)}>
                            <span className="chat-source-cover" aria-hidden="true">
                              {source.coverUrl ? <img src={assetUrl(source.coverUrl)} alt="" loading="lazy" /> : <Bot size={16} />}
                            </span>
                            <span className="chat-source-copy">
                              <strong>{source.title}</strong>
                              <small>{source.type === "chapter" ? "Chapter source" : "Manga source"}</small>
                            </span>
                            <ExternalLink size={14} />
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </article>
              ))
            )}
          </div>

          <form className="chat-input-row" onSubmit={handleSubmit}>
            <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask for manga..." maxLength={1200} aria-label="Chat message" />
            <button type="submit" disabled={!canSend} aria-label="Send message">
              <Send size={17} />
            </button>
          </form>
        </section>
      ) : null}

      <button className="chat-launcher" type="button" onClick={() => dispatch({ type: "toggle" })} aria-label={state.isOpen ? "Close manga assistant" : "Open manga assistant"}>
        <MessageCircle size={21} />
      </button>
    </div>
  );
}

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "toggle":
      return { ...state, isOpen: !state.isOpen };
    case "close":
      return { ...state, isOpen: false };
    case "userMessage":
      return {
        ...state,
        pendingMessage: action.message.content,
        messages: [...state.messages, action.message, { id: `pending-${action.message.id}`, role: "assistant", content: "", createdAt: new Date().toISOString(), isPending: true }]
      };
    case "assistantMessage":
      return {
        ...state,
        conversationId: action.conversationId,
        pendingMessage: undefined,
        messages: [...state.messages.filter((message) => !message.isPending), action.message]
      };
    case "requestFailed":
      return {
        ...state,
        messages: state.messages.map((message) => (message.isPending ? { ...message, content: action.errorMessage, isPending: false, isError: true } : message))
      };
    case "clear":
      return { isOpen: false, messages: [] };
    default:
      return state;
  }
}
