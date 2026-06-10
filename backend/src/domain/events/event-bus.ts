import type { AuthEvent } from "./auth.events.js";
import type { CatalogEvent } from "./catalog.events.js";
import type { LibraryEvent } from "./library.events.js";
import type { ProgressEvent } from "./progress.events.js";

export type DomainEvent = AuthEvent | CatalogEvent | LibraryEvent | ProgressEvent;
export type DomainEventHandler<TEvent extends DomainEvent = DomainEvent> = (event: TEvent) => void | Promise<void>;

class InProcessDomainEventBus {
  private readonly handlers = new Set<DomainEventHandler>();

  subscribe(handler: DomainEventHandler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  async publish(event: DomainEvent) {
    await Promise.all([...this.handlers].map((handler) => handler(event)));
  }

  clearHandlers() {
    this.handlers.clear();
  }
}

export const domainEvents = new InProcessDomainEventBus();
