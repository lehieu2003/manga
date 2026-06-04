import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import { env } from "./shared/configs/app.config.js";
import { connectRedis, redis } from "./infrastructure/cache/client.js";
import { errorMiddleware, registerAuthMiddleware } from "./app/middlewares/index.js";
import { authRoutes } from "./app/routes/v1/auth.routes.js";
import { catalogRoutes } from "./app/routes/v1/catalog.routes.js";
import { coverRoutes } from "./app/routes/v1/cover.routes.js";
import { pageRoutes } from "./app/routes/v1/page.routes.js";
import { healthRoutes } from "./app/routes/health.routes.js";
import { libraryRoutes } from "./app/routes/v1/library.routes.js";
import { progressRoutes } from "./app/routes/v1/progress.routes.js";
import { syncMangaDexCatalog } from "./domain/services/catalog-sync.service.js";

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

  await app.register(helmet, {
    crossOriginResourcePolicy: { policy: "cross-origin" }
  });
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

  registerAuthMiddleware(app);
  app.setErrorHandler(errorMiddleware);

  await app.register(healthRoutes);
  await app.register(authRoutes, { prefix: "/api" });
  await app.register(catalogRoutes, { prefix: "/api" });
  await app.register(coverRoutes, { prefix: "/api" });
  await app.register(pageRoutes, { prefix: "/api" });
  await app.register(libraryRoutes, { prefix: "/api" });
  await app.register(progressRoutes, { prefix: "/api" });

  if (env.SYNC_ON_STARTUP) {
    void syncMangaDexCatalog({ limit: env.SYNC_LIMIT, includeChapters: false })
      .then((result) => app.log.info({ result }, "MangaDex startup sync completed"))
      .catch((error) => app.log.warn({ error }, "MangaDex startup sync failed"));
  }

  return app;
}
