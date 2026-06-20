import type { FastifyInstance } from "fastify";
import { createBookmark, getBookmarkByChapter, listBookmarks, removeBookmark, updateBookmark } from "../../controllers/bookmark.controller.js";
import { bookmarkListQuerySchema, bookmarkParamsSchema, createBookmarkSchema, updateBookmarkSchema } from "../../validators/bookmark.validator.js";
import { bookmarkRouteSchemas } from "../../docs/route-schemas.js";
import { chapterProgressParamsSchema } from "../../validators/progress.validator.js";

export async function bookmarkRoutes(app: FastifyInstance) {
  app.get("/bookmarks", { schema: bookmarkRouteSchemas.list, preHandler: app.authenticate }, async (request) => {
    const query = bookmarkListQuerySchema.parse(request.query ?? {});
    return listBookmarks(request.user.sub, query);
  });

  app.get("/bookmarks/chapter/:chapterId", { schema: bookmarkRouteSchemas.chapter, preHandler: app.authenticate }, async (request) => {
    const { chapterId } = chapterProgressParamsSchema.parse(request.params);
    return getBookmarkByChapter(request.user.sub, chapterId);
  });

  app.post("/bookmarks", { schema: bookmarkRouteSchemas.create, preHandler: app.authenticate }, async (request) => {
    const body = createBookmarkSchema.parse(request.body);
    return createBookmark(request.user.sub, body);
  });

  app.patch("/bookmarks/:id", { schema: bookmarkRouteSchemas.update, preHandler: app.authenticate }, async (request) => {
    const { id } = bookmarkParamsSchema.parse(request.params);
    const body = updateBookmarkSchema.parse(request.body);
    return updateBookmark(request.user.sub, id, body);
  });

  app.delete("/bookmarks/:id", { schema: bookmarkRouteSchemas.remove, preHandler: app.authenticate }, async (request) => {
    const { id } = bookmarkParamsSchema.parse(request.params);
    return removeBookmark(request.user.sub, id);
  });
}
