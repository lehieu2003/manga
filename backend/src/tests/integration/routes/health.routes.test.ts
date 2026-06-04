import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

const healthMocks = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  ping: vi.fn()
}));

vi.mock("../../../infrastructure/database/client.js", () => ({
  prisma: {
    $queryRaw: healthMocks.queryRaw
  }
}));

vi.mock("../../../infrastructure/cache/client.js", () => ({
  redis: {
    ping: healthMocks.ping
  }
}));

describe("healthRoutes", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns liveness status", async () => {
    const app = await makeHealthApp();

    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
    await app.close();
  });

  it("returns ready when PostgreSQL and Redis checks pass", async () => {
    const app = await makeHealthApp();
    healthMocks.queryRaw.mockResolvedValue([{ "?column?": 1 }]);
    healthMocks.ping.mockResolvedValue("PONG");

    const response = await app.inject({ method: "GET", url: "/health/ready" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true, checks: { postgres: "ok", redis: "ok" } });
    await app.close();
  });

  it("returns unavailable when PostgreSQL check fails", async () => {
    const app = await makeHealthApp();
    healthMocks.queryRaw.mockRejectedValue(new Error("database down"));
    healthMocks.ping.mockResolvedValue("PONG");

    const response = await app.inject({ method: "GET", url: "/health/ready" });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ ok: false, checks: { postgres: "error", redis: "ok" } });
    await app.close();
  });

  it("returns unavailable when Redis check fails", async () => {
    const app = await makeHealthApp();
    healthMocks.queryRaw.mockResolvedValue([{ "?column?": 1 }]);
    healthMocks.ping.mockRejectedValue(new Error("redis down"));

    const response = await app.inject({ method: "GET", url: "/health/ready" });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ ok: false, checks: { postgres: "ok", redis: "error" } });
    await app.close();
  });
});

async function makeHealthApp() {
  const { healthRoutes } = await import("../../../app/routes/health.routes.js");
  const app = Fastify();
  await app.register(healthRoutes);
  return app;
}
