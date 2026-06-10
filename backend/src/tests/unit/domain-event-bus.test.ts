import { afterEach, describe, expect, it, vi } from "vitest";
import { domainEvents, type DomainEvent } from "../../domain/events/index.js";

describe("domain event bus", () => {
  afterEach(() => {
    domainEvents.clearHandlers();
  });

  it("publishes events to subscribed handlers", async () => {
    const handler = vi.fn();
    const event: DomainEvent = { type: "catalog.manga_cached", mangaId: "manga-1" };

    domainEvents.subscribe(handler);
    await domainEvents.publish(event);

    expect(handler).toHaveBeenCalledWith(event);
  });

  it("stops publishing to unsubscribed handlers", async () => {
    const handler = vi.fn();
    const unsubscribe = domainEvents.subscribe(handler);

    unsubscribe();
    await domainEvents.publish({ type: "auth.user_registered", userId: "user-1" });

    expect(handler).not.toHaveBeenCalled();
  });

  it("awaits async handlers before resolving", async () => {
    const received: string[] = [];
    domainEvents.subscribe(async (event) => {
      await Promise.resolve();
      received.push(event.type);
    });

    await domainEvents.publish({ type: "progress.chapter_saved", userId: "user-1", mangaId: "manga-1", chapterId: "chapter-1", pageIndex: 3, completed: false });

    expect(received).toEqual(["progress.chapter_saved"]);
  });
});
