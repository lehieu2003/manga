import type { FastifyInstance } from "fastify";
import {
  handleCreateComment,
  handleDeleteComment,
  handleListComments,
  handleListNotifications,
  handleMarkAllNotificationsRead,
  handleMarkNotificationRead,
  handleNotificationStream,
  handleRemoveCommentReaction,
  handleUpdateComment,
  handleUpsertCommentReaction
} from "../../controllers/comment.controller.js";

export async function commentRoutes(app: FastifyInstance) {
  app.get("/comments", handleListComments);
  app.post("/comments", { preHandler: app.authenticate }, handleCreateComment);
  app.patch("/comments/:id", { preHandler: app.authenticate }, handleUpdateComment);
  app.delete("/comments/:id", { preHandler: app.authenticate }, handleDeleteComment);
  app.post("/comments/:id/reaction", { preHandler: app.authenticate }, handleUpsertCommentReaction);
  app.delete("/comments/:id/reaction", { preHandler: app.authenticate }, handleRemoveCommentReaction);
  app.get("/notifications", { preHandler: app.authenticate }, handleListNotifications);
  app.patch("/notifications/read-all", { preHandler: app.authenticate }, handleMarkAllNotificationsRead);
  app.patch("/notifications/:id/read", { preHandler: app.authenticate }, handleMarkNotificationRead);
  app.get("/notifications/stream", handleNotificationStream);
}
