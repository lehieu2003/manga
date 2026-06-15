import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  createComment,
  deleteComment,
  listComments,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  removeCommentReaction,
  updateComment,
  upsertCommentReaction
} from "../../../domain/services/comment.service.js";
import { subscribeToNotifications } from "../../../domain/services/notification-stream.service.js";
import { env } from "../../../shared/configs/app.config.js";
import { HttpError } from "../../../shared/errors/http-error.js";
import { commentIdParamsSchema, createCommentSchema, listCommentsSchema, updateCommentSchema, upsertReactionSchema } from "../../validators/comment.validator.js";

export async function commentRoutes(app: FastifyInstance) {
  app.get("/comments", async (request) => {
    await attachOptionalUser(request);
    const query = listCommentsSchema.parse(request.query);
    return listComments({ ...query, userId: request.user?.sub });
  });

  app.post("/comments", { preHandler: app.authenticate }, async (request) => {
    const body = createCommentSchema.parse(request.body);
    return createComment({ ...body, authorId: request.user.sub });
  });

  app.patch("/comments/:id", { preHandler: app.authenticate }, async (request) => {
    const { id } = commentIdParamsSchema.parse(request.params);
    const body = updateCommentSchema.parse(request.body ?? {});
    return updateComment(request.user.sub, id, body);
  });

  app.delete("/comments/:id", { preHandler: app.authenticate }, async (request) => {
    const { id } = commentIdParamsSchema.parse(request.params);
    return deleteComment({ id: request.user.sub, role: request.user.role }, id);
  });

  app.post("/comments/:id/reaction", { preHandler: app.authenticate }, async (request) => {
    const { id } = commentIdParamsSchema.parse(request.params);
    const body = upsertReactionSchema.parse(request.body);
    return upsertCommentReaction(request.user.sub, id, body.type);
  });

  app.delete("/comments/:id/reaction", { preHandler: app.authenticate }, async (request) => {
    const { id } = commentIdParamsSchema.parse(request.params);
    return removeCommentReaction(request.user.sub, id);
  });

  app.get("/notifications", { preHandler: app.authenticate }, async (request) => {
    const limit = Number((request.query as { limit?: string }).limit ?? 30);
    return listNotifications(request.user.sub, Number.isFinite(limit) ? limit : 30);
  });

  app.patch("/notifications/read-all", { preHandler: app.authenticate }, async (request) => {
    return markAllNotificationsRead(request.user.sub);
  });

  app.patch("/notifications/:id/read", { preHandler: app.authenticate }, async (request) => {
    const { id } = commentIdParamsSchema.parse(request.params);
    return markNotificationRead(request.user.sub, id);
  });

  app.get("/notifications/stream", async (request, reply) => {
    const userId = await authenticateStreamUser(app, request);
    reply.hijack();
    reply.raw.writeHead(200, {
      ...getStreamCorsHeaders(request),
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    });
    reply.raw.write("event: ready\ndata: {}\n\n");

    const unsubscribe = subscribeToNotifications(userId, (payload) => {
      reply.raw.write(`event: notification\ndata: ${JSON.stringify(payload)}\n\n`);
    });
    const keepAlive = setInterval(() => reply.raw.write(": keep-alive\n\n"), 25_000);
    request.raw.on("close", () => {
      clearInterval(keepAlive);
      unsubscribe();
      reply.raw.end();
    });
  });
}

async function attachOptionalUser(request: FastifyRequest) {
  const header = request.headers.authorization;
  if (!header) return;
  try {
    await request.jwtVerify();
  } catch {
    request.log.debug("Ignoring invalid optional auth token for public comments request");
  }
}

async function authenticateStreamUser(app: FastifyInstance, request: FastifyRequest) {
  const bearer = request.headers.authorization?.replace(/^Bearer\s+/i, "");
  const token = bearer || (request.query as { token?: string }).token;
  if (!token) throw new HttpError(401, "Notification stream authentication is required", "NOTIFICATION_STREAM_AUTH_REQUIRED");
  try {
    const payload = app.jwt.verify<{ sub: string }>(token);
    return payload.sub;
  } catch {
    throw new HttpError(401, "Notification stream authentication is invalid", "NOTIFICATION_STREAM_AUTH_INVALID");
  }
}

function getStreamCorsHeaders(request: FastifyRequest) {
  const origin = request.headers.origin;
  const allowedOrigins = env.CORS_ORIGIN.split(",").map((item) => item.trim());
  const allowOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin"
  };
}
