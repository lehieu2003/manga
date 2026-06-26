import type { FastifyInstance } from "fastify";
import { handleCreateBookmark, handleGetBookmarkByChapter, handleListBookmarks, handleRemoveBookmark, handleUpdateBookmark } from "../../controllers/bookmark.controller.js";
import { bookmarkRouteSchemas } from "../../docs/route-schemas.js";

export async function bookmarkRoutes(app: FastifyInstance) {
  app.get("/bookmarks", { schema: bookmarkRouteSchemas.list, preHandler: app.authenticate }, handleListBookmarks);
  app.get("/bookmarks/chapter/:chapterId", { schema: bookmarkRouteSchemas.chapter, preHandler: app.authenticate }, handleGetBookmarkByChapter);
  app.post("/bookmarks", { schema: bookmarkRouteSchemas.create, preHandler: app.authenticate }, handleCreateBookmark);
  app.patch("/bookmarks/:id", { schema: bookmarkRouteSchemas.update, preHandler: app.authenticate }, handleUpdateBookmark);
  app.delete("/bookmarks/:id", { schema: bookmarkRouteSchemas.remove, preHandler: app.authenticate }, handleRemoveBookmark);
}
