import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import staticPlugin from "@fastify/static";
import { createWriteStream, mkdirSync, type WriteStream } from "node:fs";
import { dirname, resolve } from "node:path";
import Fastify, { type FastifyReply, type FastifyRequest, type FastifyServerOptions } from "fastify";
import { env } from "./shared/configs/app.config.js";
import { connectRedis, redis } from "./infrastructure/cache/client.js";
import { registerSwagger } from "./app/docs/swagger.js";
import { errorMiddleware, registerAuthMiddleware } from "./app/middlewares/index.js";
import { adminRoutes } from "./app/routes/v1/admin.routes.js";
import { adminCatalogRoutes } from "./app/routes/v1/admin.catalog.routes.js";
import { adminRagRoutes } from "./app/routes/v1/admin-rag.routes.js";
import { authRoutes } from "./app/routes/v1/auth.routes.js";
import { bookmarkRoutes } from "./app/routes/v1/bookmark.routes.js";
import { catalogRoutes } from "./app/routes/v1/catalog.routes.js";
import { chatRoutes } from "./app/routes/v1/chat.routes.js";
import { commentRoutes } from "./app/routes/v1/comment.routes.js";
import { coverRoutes } from "./app/routes/v1/cover.routes.js";
import { pageRoutes } from "./app/routes/v1/page.routes.js";
import { healthRoutes } from "./app/routes/health.routes.js";
import { friendshipRoutes } from "./app/routes/v1/friendship.routes.js";
import { libraryRoutes } from "./app/routes/v1/library.routes.js";
import { progressRoutes } from "./app/routes/v1/progress.routes.js";
import { searchHistoryRoutes } from "./app/routes/v1/search-history.routes.js";
import { socialConversationRoutes } from "./app/routes/v1/social-conversation.routes.js";
import { syncMangaDexCatalog } from "./domain/services/catalog-sync.service.js";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

function createLoggerOptions(): FastifyServerOptions["logger"] {
  if (!env.LOG_FILE) {
    return env.NODE_ENV === "development"
      ? {
          transport: {
            target: "pino-pretty",
            options: { colorize: true }
          }
        }
      : true;
  }

  mkdirSync(dirname(env.LOG_FILE), { recursive: true });
  const logFileStream: WriteStream = createWriteStream(env.LOG_FILE, { flags: "a" });

  return {
    level: env.LOG_LEVEL,
    stream: {
      write(message: string) {
        process.stdout.write(message);
        logFileStream.write(message);
      }
    }
  };
}

export async function buildApp() {
  const hasRedis = await connectRedis();

  const app = Fastify({
    logger: createLoggerOptions()
  });

  await app.register(helmet, {
    crossOriginResourcePolicy: { policy: "cross-origin" }
  });
  await app.register(cors, {
    origin: env.CORS_ORIGIN.split(",").map((origin) => origin.trim()),
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
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
  await app.register(multipart, {
    limits: {
      fileSize: env.AVATAR_MAX_BYTES,
      files: 1
    }
  });
  const uploadRoot = resolve(env.UPLOAD_DIR);
  mkdirSync(uploadRoot, { recursive: true });
  await app.register(staticPlugin, {
    root: uploadRoot,
    prefix: "/uploads/",
    decorateReply: false
  });

  registerAuthMiddleware(app);
  app.setErrorHandler(errorMiddleware);

  await registerSwagger(app);
  await app.register(healthRoutes);
  await app.register(adminRoutes, { prefix: "/api" });
  await app.register(adminCatalogRoutes, { prefix: "/api" });
  await app.register(adminRagRoutes, { prefix: "/api" });
  await app.register(authRoutes, { prefix: "/api" });
  await app.register(bookmarkRoutes, { prefix: "/api" });
  await app.register(catalogRoutes, { prefix: "/api" });
  await app.register(chatRoutes, { prefix: "/api" });
  await app.register(commentRoutes, { prefix: "/api" });
  await app.register(coverRoutes, { prefix: "/api" });
  await app.register(friendshipRoutes, { prefix: "/api" });
  await app.register(socialConversationRoutes, { prefix: "/api" });
  await app.register(pageRoutes, { prefix: "/api" });
  await app.register(libraryRoutes, { prefix: "/api" });
  await app.register(progressRoutes, { prefix: "/api" });
  await app.register(searchHistoryRoutes, { prefix: "/api" });

  if (env.SYNC_ON_STARTUP) {
    void syncMangaDexCatalog({ limit: env.SYNC_LIMIT, includeChapters: false })
      .then((result) => app.log.info({ result }, "MangaDex startup sync completed"))
      .catch((error) => app.log.warn({ error }, "MangaDex startup sync failed"));
  }

  return app;
}
