import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyError, type FastifyReply, type FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { env } from "./config.js";
import { HttpError } from "./lib/http-error.js";
import { connectRedis, redis } from "./lib/redis.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { catalogRoutes } from "./modules/catalog/catalog.routes.js";
import { coverRoutes } from "./modules/catalog/cover.routes.js";
import { libraryRoutes } from "./modules/library/library.routes.js";
import { progressRoutes } from "./modules/progress/progress.routes.js";
import { syncMangaDexCatalog } from "./modules/catalog/sync.service.js";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export async function buildApp() {
  const hasRedis = await connectRedis();

  const app = Fastify({
    logger:
      env.NODE_ENV === "development"
        ? {
            transport: {
              target: "pino-pretty",
              options: { colorize: true }
            }
          }
        : true
  });

  await app.register(helmet);
  await app.register(cors, {
    origin: env.CORS_ORIGIN.split(",").map((origin) => origin.trim()),
    credentials: true
  });
  await app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_EXPIRES_IN }
  });
  await app.register(rateLimit, {
    max: 120,
    timeWindow: "1 minute",
    ...(hasRedis ? { redis } : {})
  });

  app.decorate("authenticate", async (request: FastifyRequest) => {
    await request.jwtVerify();
  });

  app.setErrorHandler((error: FastifyError, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: error.flatten()
        }
      });
    }

    if (error instanceof HttpError) {
      return reply.code(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message
        }
      });
    }

    if ("statusCode" in error && typeof error.statusCode === "number") {
      return reply.code(error.statusCode).send({
        error: {
          code: error.code ?? "REQUEST_ERROR",
          message: error.message
        }
      });
    }

    app.log.error(error);
    return reply.code(500).send({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Unexpected server error"
      }
    });
  });

  app.get("/health", async () => ({ ok: true }));
  await app.register(authRoutes, { prefix: "/api" });
  await app.register(catalogRoutes, { prefix: "/api" });
  await app.register(coverRoutes, { prefix: "/api" });
  await app.register(libraryRoutes, { prefix: "/api" });
  await app.register(progressRoutes, { prefix: "/api" });

  if (env.SYNC_ON_STARTUP) {
    void syncMangaDexCatalog({ limit: env.SYNC_LIMIT, includeChapters: false })
      .then((result) => app.log.info({ result }, "MangaDex startup sync completed"))
      .catch((error) => app.log.warn({ error }, "MangaDex startup sync failed"));
  }

  return app;
}
