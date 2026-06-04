import { describe, expect, it } from "vitest";
import { buildApp } from "../../../server.js";

describe("swagger docs", () => {
  it("serves an OpenAPI document with public and protected routes", async () => {
    const app = await buildApp();

    const response = await app.inject({ method: "GET", url: "/docs/json" });
    const document = response.json() as {
      openapi: string;
      paths: Record<string, Record<string, { security?: Array<Record<string, unknown>> }>>;
      components?: { securitySchemes?: Record<string, unknown> };
    };

    expect(response.statusCode).toBe(200);
    expect(document.openapi).toBe("3.0.3");
    expect(document.paths["/api/auth/login"]).toBeDefined();
    expect(document.paths["/api/manga/search"]).toBeDefined();
    expect(document.paths["/api/library"]).toBeDefined();
    expect(document.paths["/health/ready"]).toBeDefined();
    expect(document.components?.securitySchemes?.bearerAuth).toBeDefined();
    expect(document.paths["/api/library"].get.security).toEqual([{ bearerAuth: [] }]);
    expect(document.paths["/api/auth/login"].post.security).toBeUndefined();
    expect(document.paths["/api/manga/search"].get.security).toBeUndefined();

    await app.close();
  });

  it("serves Swagger UI", async () => {
    const app = await buildApp();

    const response = await app.inject({ method: "GET", url: "/docs" });

    expect([200, 301, 302]).toContain(response.statusCode);
    if (response.statusCode === 200) {
      expect(response.headers["content-type"]).toContain("text/html");
      expect(response.body).toContain("Swagger UI");
    }

    await app.close();
  });
});
