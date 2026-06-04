import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import type { FastifyInstance } from "fastify";

export async function registerSwagger(app: FastifyInstance) {
  await app.register(swagger, {
    openapi: {
      openapi: "3.0.3",
      info: {
        title: "MangaDex Reader API",
        description: "Backend API for MangaDex catalog, reader proxy, auth, library, and reading progress.",
        version: "0.1.0"
      },
      tags: [
        { name: "Health", description: "Service liveness and dependency readiness" },
        { name: "Auth", description: "Account, JWT access tokens, and refresh sessions" },
        { name: "Catalog", description: "MangaDex search, manga details, genres, chapters, and reader metadata" },
        { name: "Media", description: "Cover and chapter page image proxy endpoints" },
        { name: "Library", description: "Authenticated user's manga shelf" },
        { name: "Progress", description: "Authenticated user's reading progress" }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT"
          }
        }
      }
    }
  });

  await app.register(swaggerUi, {
    routePrefix: "/docs",
    staticCSP: true,
    uiConfig: {
      docExpansion: "list",
      deepLinking: true
    }
  });
}
